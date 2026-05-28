import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WaitlistService } from './waitlist.service';
import { CrmService } from '../crm/crm.service';
import { CrmIntegrationService } from '../crm/crm-integration.service';
import { MailService } from '../mail/mail.service';
import { ResBookingOrigin, ResBookingStatus } from '../../common/enums';
import { $Enums } from '@prisma/client';
import { getUserScope, assertRestaurantAccess, ensureRestaurantAccess, ensureHotelAccess, type AuthenticatedUser } from '../../common/scope';
import { RestaurantAvailabilityService } from './restaurant-availability.service';
import { RestaurantAccessService } from './restaurant-access.service';
import { sanitizeMailConfig } from './mail-config-sanitizer';
import { toDateOnlyString, zonedDateToUtc, zonedDayRangeUtc } from '../../common/timezone';
import { findClusterForPax, isTableBooked, type SlotBooking, type SlotTable } from './availability-helpers';

// Margen mínimo (en minutos) antes de la reserva para permitir modificar/cancelar desde la web pública.
const PUBLIC_EDIT_CUTOFF_MINUTES = 120;

@Injectable()
export class RestaurantService {
    private readonly logger = new Logger(RestaurantService.name);

    constructor(
        private prisma: PrismaService,
        private waitlistService: WaitlistService,
        private crmService: CrmService,
        private crmIntegrationService: CrmIntegrationService,
        private mailService: MailService,
        private availability: RestaurantAvailabilityService,
        private access: RestaurantAccessService,
    ) { }


    async createRestaurant(data: any) {
        return this.prisma.restaurant.create({
            data: {
                ...data,
                widgetConfig: {
                    create: {} // Create default widget config
                }
            }
        });
    }

    /**
     * Verifica que el usuario tenga acceso a la Zone indicada.
     * Una Zone puede colgar de un restaurante o de un hotel; comprobamos contra el que aplique.
     */
    private async ensureZoneAccess(user: AuthenticatedUser, zoneId: string): Promise<void> {
        const zone = await this.prisma.zone.findUnique({
            where: { id: zoneId },
            select: { restaurantId: true, hotelId: true }
        });
        if (!zone) throw new NotFoundException('Zona no encontrada');
        if (zone.restaurantId) {
            await ensureRestaurantAccess(user, this.prisma, zone.restaurantId);
        } else if (zone.hotelId) {
            await ensureHotelAccess(user, this.prisma, zone.hotelId);
        }
        // Zone sin owner: la dejamos pasar (caso raro, equivale a "global").
    }

    /** Resuelve el restaurantId al que pertenece un Shift. */
    private async restaurantIdForShift(shiftId: string): Promise<string> {
        const shift = await this.prisma.shift.findUnique({
            where: { id: shiftId },
            select: { restaurantId: true }
        });
        if (!shift) throw new NotFoundException('Turno no encontrado');
        return shift.restaurantId;
    }

    /** Resuelve el restaurantId al que pertenece un RestaurantClosure. */
    private async restaurantIdForClosure(closureId: string): Promise<string> {
        const c = await this.prisma.restaurantClosure.findUnique({
            where: { id: closureId },
            select: { restaurantId: true }
        });
        if (!c) throw new NotFoundException('Cierre no encontrado');
        return c.restaurantId;
    }

    /** Resuelve el restaurantId al que pertenece un RestaurantOpening. */
    private async restaurantIdForOpening(openingId: string): Promise<string> {
        const o = await this.prisma.restaurantOpening.findUnique({
            where: { id: openingId },
            select: { restaurantId: true }
        });
        if (!o) throw new NotFoundException('Apertura no encontrada');
        return o.restaurantId;
    }

    private async getRestaurantConfig(restaurantId: string): Promise<{ timezone: string; defaultDuration: number; bufferMinutes: number }> {
        const r = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { timezone: true, defaultDuration: true, bufferMinutes: true }
        });
        return {
            timezone: r?.timezone || 'Europe/Madrid',
            defaultDuration: r?.defaultDuration || 90,
            bufferMinutes: r?.bufferMinutes ?? 15
        };
    }

    /** Resuelve el restaurantId al que pertenece un ResBooking. */
    private async restaurantIdForBooking(bookingId: string): Promise<string> {
        const b = await this.prisma.resBooking.findUnique({
            where: { id: bookingId },
            select: { restaurantId: true }
        });
        if (!b) throw new NotFoundException('Reserva no encontrada');
        return b.restaurantId;
    }

    async getRestaurants(user?: AuthenticatedUser) {
        const scope = await getUserScope(user, this.prisma);
        const restaurants = await this.prisma.restaurant.findMany({
            where: scope.restaurantIds === null ? {} : { id: { in: scope.restaurantIds } },
            include: { zones: true }
        });
        return restaurants.map(r => sanitizeMailConfig(r));
    }

    async getRestaurant(id: string, user?: AuthenticatedUser) {
        if (user) {
            const scope = await getUserScope(user, this.prisma);
            assertRestaurantAccess(scope, id);
        }
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
            include: { hotel: true, widgetConfig: true, shifts: true }
        });
        return sanitizeMailConfig(restaurant);
    }

    /**
     * Datos públicos del restaurante para el widget embebido. Devuelve sólo lo
     * estrictamente necesario para pintar el calendario y el formulario, sin
     * mailConfig, sin secretos de integraciones (de Stripe sólo `enabled` y
     * `publicKey`) y sin datos privados de personal/usuarios.
     *
     * IMPORTANTE: este endpoint NO requiere auth — todo lo que se devuelva
     * aquí queda expuesto al mundo. Cualquier dato sensible debe filtrarse
     * en este método antes de salir.
     */
    async getPublicInfo(id: string) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                currency: true,
                timezone: true,
                defaultDuration: true,
                integrations: true,
                widgetConfig: true,
                shifts: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        startTime: true,
                        endTime: true,
                        daysOfWeek: true,
                    },
                },
            },
        });
        if (!restaurant) throw new NotFoundException('Restaurante no encontrado');

        // Sanitizar `integrations`: exponer sólo lo que el widget necesita y
        // que no es secreto (Stripe publicKey y enabled).
        const rawIntegrations = (restaurant.integrations ?? {}) as Record<string, unknown>;
        const stripeRaw = (rawIntegrations.stripe ?? {}) as Record<string, unknown>;
        const safeIntegrations = {
            stripe: {
                enabled: !!stripeRaw.enabled,
                publicKey: typeof stripeRaw.publicKey === 'string' ? stripeRaw.publicKey : '',
            },
        };

        return {
            id: restaurant.id,
            name: restaurant.name,
            currency: restaurant.currency,
            timezone: restaurant.timezone,
            defaultDuration: restaurant.defaultDuration,
            widgetConfig: restaurant.widgetConfig,
            shifts: restaurant.shifts,
            integrations: safeIntegrations,
        };
    }


    async updateRestaurant(id: string, data: any, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, id);
        const { hotelId, ...rest } = data;

        // Si llega mailConfig sanitizado (sin pass o clientSecret), preservar los del actual.
        // Convención: pass === null o clientSecret === null = borrar explícitamente.
        // pass === '' o undefined = preservar el actual (input vacío).
        if (rest.mailConfig) {
            const existing = await this.prisma.restaurant.findUnique({ where: { id }, select: { mailConfig: true } });
            const currentCfg: any = existing?.mailConfig || {};
            const incoming: any = rest.mailConfig || {};
            if (incoming.pass === null) {
                incoming.pass = '';
            } else if (incoming.pass === undefined || incoming.pass === '') {
                incoming.pass = currentCfg.pass;
            }
            if (incoming.graph) {
                if (incoming.graph.clientSecret === null) {
                    incoming.graph.clientSecret = '';
                } else if (incoming.graph.clientSecret === undefined || incoming.graph.clientSecret === '') {
                    incoming.graph.clientSecret = currentCfg.graph?.clientSecret;
                }
            } else if (currentCfg.graph) {
                incoming.graph = currentCfg.graph;
            }
            delete incoming.passConfigured;
            if (incoming.graph) delete incoming.graph.clientSecretConfigured;
            rest.mailConfig = incoming;
        }

        return this.prisma.$transaction(async (tx) => {
            // Update restaurant basic info
            const restaurant = await tx.restaurant.update({
                where: { id },
                data: rest
            });

            // Handle Synergy Link (Bidirectional)
            if (hotelId === 'none' || hotelId === '') {
                // Clear existing link for this restaurant
                await tx.hotel.updateMany({
                    where: { restaurantId: id },
                    data: { restaurantId: null }
                });
            } else if (hotelId) {
                // 1. Clear this restaurant from any OTHER hotel first to maintain uniqueness
                await tx.hotel.updateMany({
                    where: { restaurantId: id },
                    data: { restaurantId: null }
                });
                
                // 2. Link this restaurant to the selected hotel
                await tx.hotel.update({
                    where: { id: hotelId },
                    data: { restaurantId: id }
                });
            }

            return restaurant;
        });
    }


    async deleteRestaurant(id: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, id);
        return this.prisma.$transaction(async (tx) => {
            // 1. Clear any hotel links to this restaurant to avoid FK errors
            await tx.hotel.updateMany({
                where: { restaurantId: id },
                data: { restaurantId: null }
            });

            // 2. Delete dependent entities
            await tx.resBooking.deleteMany({ where: { restaurantId: id } });
            await tx.restaurantWaitlist.deleteMany({ where: { restaurantId: id } });
            await tx.restaurantClosure.deleteMany({ where: { restaurantId: id } });
            await tx.shift.deleteMany({ where: { restaurantId: id } });
            await tx.widgetConfig.deleteMany({ where: { restaurantId: id } });
            await tx.event.deleteMany({ where: { restaurantId: id } });
            
            // 3. Delete tables and zones (order is critical: tables first)
            const zones = await tx.zone.findMany({ 
                where: { restaurantId: id },
                select: { id: true } 
            });
            const zoneIds = zones.map(z => z.id);
            
            if (zoneIds.length > 0) {
                await tx.table.deleteMany({ 
                    where: { zoneId: { in: zoneIds } } 
                });
                await tx.zone.deleteMany({ 
                    where: { restaurantId: id } 
                });
            }

            // 4. Finally delete the restaurant
            return tx.restaurant.delete({
                where: { id }
            });
        });
    }

    private static readonly UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // --- Visual Plan & Zones ---
    async syncZones(restaurantId: string, zones: any[], user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        for (const z of zones) {
            if (z.id && RestaurantService.UUID_RE.test(z.id)) {
                await this.prisma.zone.update({ where: { id: z.id }, data: { name: z.name, index: z.index, isActive: z.isActive } });
            } else {
                await this.prisma.zone.create({ data: { restaurantId, name: z.name, index: z.index } });
            }
        }
        return this.getTables(restaurantId);
    }

    async createZone(restaurantId: string, name: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.zone.create({
            data: { restaurantId, name }
        });
    }

    // --- Tables ---
    async syncTables(zoneId: string, tables: any[], user?: AuthenticatedUser) {
        if (user) await this.ensureZoneAccess(user, zoneId);
        return this.prisma.$transaction(async (tx) => {
            const results: any[] = [];
            const idMap: Record<string, string> = {};

            // 1. Create/Update tables and build ID map
            for (const t of tables) {
                const capacity = Number(t.capacity) || 4;
                const tableData: any = {
                    x: Number(t.x) || 0,
                    y: Number(t.y) || 0,
                    width: Number(t.width) || 60,
                    height: Number(t.height) || 60,
                    rotation: Number(t.rotation) || 0,
                    shape: t.shape || 'RECTANGLE',
                    name: t.name || 'Mesa',
                    capacity: capacity,
                    minPax: Number(t.minPax) || 1,
                    maxPax: Number(t.maxPax) || capacity,
                    seatsLostPerJoin: Number(t.seatsLostPerJoin) || 1,
                    metadata: t.metadata || {}
                };

                // Temporary store contiguousTableIds if present as a top-level prop or in metadata
                const cids = t.contiguousTableIds || t.metadata?.contiguousTableIds || [];

                let synced;
                if (t.id && !t.id.startsWith('temp-')) {
                    synced = await tx.table.update({
                        where: { id: t.id },
                        data: tableData
                    });
                    idMap[t.id] = synced.id;
                } else {
                    synced = await tx.table.create({
                        data: { zoneId, ...tableData }
                    });
                    if (t.id) idMap[t.id] = synced.id;
                }
                results.push({ ...synced, _originalCids: cids });
            }

            // 2. Second pass: Fix contiguousTableIds in metadata using the idMap
            const finalResults: any[] = [];
            for (const res of results) {
                const originalCids = res._originalCids || [];
                const mappedCids = originalCids.map((cid: string) => idMap[cid] || cid);

                const updated = await tx.table.update({
                    where: { id: res.id },
                    data: {
                        metadata: {
                            ...(res.metadata as any || {}),
                            contiguousTableIds: mappedCids
                        }
                    }
                });
                finalResults.push(updated);
            }

            return finalResults;
        });
    }

    async createTable(zoneId: string, name: string, capacity: number, user?: AuthenticatedUser) {
        if (user) await this.ensureZoneAccess(user, zoneId);
        return this.prisma.table.create({
            data: { zoneId, name, capacity }
        });
    }

    async getGuestStats(email?: string | null, phone?: string | null) {
        if (!email && !phone) return { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancelledOrNoShowRate: 0 };

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                OR: [
                    email ? { guestEmail: email } : null,
                    phone ? { guestPhone: phone } : null
                ].filter(Boolean) as any
            },
            select: {
                status: true,
                date: true
            }
        });

        // Excluimos reservas no confirmadas: no son compromisos firmes y no procede contarlas como "ratio de incumplimiento".
        const committed = bookings.filter(b => b.status !== 'PENDING_CONFIRMATION');
        const totalBookings = committed.length;
        const visitCount = committed.filter(b => b.status === 'SEATED').length;
        const cancelledCount = committed.filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length;

        let firstVisit: Date | null = null;
        if (bookings.length > 0) {
            firstVisit = bookings.reduce((prev, curr) =>
                (curr.date < prev.date) ? curr : prev
            ).date;
        }

        return {
            visitCount,
            firstVisit,
            cancelledCount,
            totalBookings,
            cancelledOrNoShowRate: totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0
        };
    }

    private async getBatchGuestStats(guests: Array<{ email?: string | null; phone?: string | null }>) {
        if (guests.length === 0) return new Map();

        // Get all unique email and phone combinations
        const emails = [...new Set(guests.map(g => g.email).filter(Boolean))];
        const phones = [...new Set(guests.map(g => g.phone).filter(Boolean))];

        // Single query to get all bookings for all guests
        const allBookings = await this.prisma.resBooking.findMany({
            where: {
                OR: [
                    ...emails.map(email => ({ guestEmail: email })),
                    ...phones.map(phone => ({ guestPhone: phone }))
                ]
            },
            select: {
                guestEmail: true,
                guestPhone: true,
                status: true,
                date: true
            }
        });

        // Calculate stats for each guest
        const statsMap = new Map<string, any>();
        for (const guest of guests) {
            const key = guest.email || guest.phone || '';
            if (!key) {
                statsMap.set(key, { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancelledOrNoShowRate: 0 });
                continue;
            }

            const guestBookings = allBookings.filter(b =>
                (guest.email && b.guestEmail === guest.email) ||
                (guest.phone && b.guestPhone === guest.phone)
            );

            const committed = guestBookings.filter(b => b.status !== 'PENDING_CONFIRMATION');
            const totalBookings = committed.length;
            const visitCount = committed.filter(b => b.status === 'SEATED').length;
            const cancelledCount = committed.filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length;

            let firstVisit: Date | null = null;
            if (guestBookings.length > 0) {
                firstVisit = guestBookings.reduce((prev, curr) =>
                    (curr.date < prev.date) ? curr : prev
                ).date;
            }

            statsMap.set(key, {
                visitCount,
                firstVisit,
                cancelledCount,
                totalBookings,
                cancelledOrNoShowRate: totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0
            });
        }

        return statsMap;
    }

    async getTables(restaurantId: string, dateStr?: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const { timezone } = await this.getRestaurantConfig(restaurantId);
        const dayStr = toDateOnlyString(dateStr || new Date());
        const { start, end } = zonedDayRangeUtc(dayStr, timezone);

        const zones = await this.prisma.zone.findMany({
            where: { restaurantId, isActive: true },
            orderBy: { index: 'asc' },
            include: {
                tables: { 
                    where: { isActive: true }
                }
            }
        });

        // Fetch all today's bookings for this restaurant
        const bookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: start, lte: end },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] }
            },
            orderBy: { date: 'asc' }
        });

        // Batch load all guest stats in a single query
        const guestStatsMap = await this.getBatchGuestStats(
            bookings.map(b => ({ email: b.guestEmail, phone: b.guestPhone }))
        );

        // Attach stats to bookings
        for (const booking of bookings) {
            const key = booking.guestEmail || booking.guestPhone || '';
            const stats = guestStatsMap.get(key) || { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancelledOrNoShowRate: 0 };
            (booking as any).visitCount = stats.visitCount;
            (booking as any).guestStats = stats;
        }

        // Distribute bookings to tables (including linked/grouped tables)
        for (const zone of zones) {
            for (const table of zone.tables) {
                (table as any).resBookings = bookings.filter(b => {
                    // Primary table
                    if (b.tableId === table.id) return true;
                    
                    // Grouped/Linked tables stored in booking metadata
                    const meta = (b as any).metadata || {};
                    if (meta.linkedTableIds && Array.isArray(meta.linkedTableIds)) {
                        return meta.linkedTableIds.includes(table.id);
                    }
                    
                    return false;
                });
            }
        }

        return zones;
    }

    // --- Bookings ---
    async updateBooking(id: string, data: any, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForBooking(id));
        return this.prisma.resBooking.update({
            where: { id },
            data,
            include: { table: { include: { zone: true } } }
        });
    }

    async createBooking(data: any, user?: AuthenticatedUser) {
        if (user && data?.restaurantId) await ensureRestaurantAccess(user, this.prisma, data.restaurantId);
        const { name, ...rest } = data;

        const booking = await this.prisma.$transaction(async (tx) => {
            const created = await tx.resBooking.create({
                data: {
                    ...rest,
                    guestName: data.guestName || name
                }
            });

            if (!created.tableId && created.restaurantId && created.date) {
                const { defaultDuration, bufferMinutes } = await this.getRestaurantConfig(created.restaurantId);
                const cluster = await this.availability.findAvailableCluster(
                    created.restaurantId,
                    new Date(created.date),
                    created.pax,
                    defaultDuration,
                    tx,
                    bufferMinutes
                );
                if (cluster) {
                    return tx.resBooking.update({
                        where: { id: created.id },
                        data: {
                            tableId: cluster.tableId,
                            metadata: { ...(created.metadata as any || {}), linkedTableIds: cluster.linkedTableIds }
                        }
                    });
                }
                this.logger.warn(`createBooking ${created.id}: sin mesa libre tras re-verificación, queda sin asignar.`);
            }

            return created;
        });

        // Identify Guest in CRM
        this.crmService.identify({
            email: booking.guestEmail ?? undefined,
            phone: booking.guestPhone ?? undefined,
            firstName: booking.guestName.split(' ')[0],
            lastName: booking.guestName.split(' ').slice(1).join(' ')
        }).catch(err => this.logger.error(`Error identifying guest in CRM: ${err.message}`));
        
        // Sync with CRM
        this.crmIntegrationService.syncRestaurantBooking(booking.id).catch(err => {
            this.logger.error(`Error syncing booking ${booking.id} to CRM:`, err);
        });
        
        return booking;
    }

    /**
     * Calcula linkedTableIds para una asignación manual de mesa: si el pax cabe en la
     * mesa, no hay cluster (devuelve []); si no, intenta crecer hacia mesas contiguas
     * libres usando BFS y devuelve los IDs adicionales (sin la cabecera).
     */
    private async computeManualCluster(
        restaurantId: string,
        startTableId: string,
        pax: number,
        date: Date,
        duration: number,
        excludeBookingId: string,
    ): Promise<string[]> {
        const tables = await this.prisma.table.findMany({
            where: { zone: { restaurantId }, isActive: true },
        }) as unknown as SlotTable[];
        const startTable = tables.find(t => t.id === startTableId);
        if (!startTable) return [];
        if (pax <= startTable.maxPax) return [];

        const bookingsRaw = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: new Date(date.getTime() - 24 * 60 * 60 * 1000), lte: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] },
                id: { not: excludeBookingId },
            },
            select: { id: true, date: true, duration: true, tableId: true, metadata: true },
        });
        const bookings: SlotBooking[] = bookingsRaw.map(b => {
            const meta = (b.metadata as { linkedTableIds?: unknown } | null) || {};
            const linked = Array.isArray(meta.linkedTableIds) ? (meta.linkedTableIds as string[]) : undefined;
            return {
                id: b.id,
                date: b.date,
                duration: b.duration,
                tableId: b.tableId,
                ...(linked ? { linkedTableIds: linked } : {}),
            };
        });
        const freeTables = tables.filter(t =>
            t.id === startTableId || !isTableBooked(t, date, duration, bookings),
        );
        const cluster = findClusterForPax(startTable, freeTables, pax);
        if (!cluster) return [];
        return cluster.filter(id => id !== startTableId);
    }

    async updateBookingStatus(bookingId: string, status: string, tableId?: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForBooking(bookingId));
        const updateData: any = { status };
        if (tableId) updateData.tableId = tableId;

        // Al cancelar (o no-show) liberamos la mesa para que el cluster quede disponible
        // y la mesa no aparezca pintada como ocupada en el plano.
        if (status === 'CANCELLED' || status === 'NO_SHOW') {
            const prev = await this.prisma.resBooking.findUnique({
                where: { id: bookingId },
                select: { metadata: true }
            });
            updateData.tableId = null;
            updateData.metadata = { ...((prev?.metadata as any) || {}), linkedTableIds: [] };
        } else if (tableId) {
            // Asignación manual: si el pax no cabe en la mesa elegida, intentamos
            // formar un cluster con mesas contiguas libres para que ambas se vean ocupadas.
            const prev = await this.prisma.resBooking.findUnique({
                where: { id: bookingId },
                select: { pax: true, date: true, duration: true, restaurantId: true, metadata: true }
            });
            if (prev) {
                const linked = await this.computeManualCluster(prev.restaurantId, tableId, prev.pax, prev.date, prev.duration, bookingId);
                updateData.metadata = { ...((prev.metadata as any) || {}), linkedTableIds: linked };
            }
        }

        const booking = await this.prisma.resBooking.update({
            where: { id: bookingId },
            data: updateData
        });

        // Trigger waitlist check if cancelled
        if (status === 'CANCELLED') {
            this.waitlistService.checkWaitlistForAvailability(
                booking.restaurantId,
                booking.date
            );
        }

        // If seated, update the CRM Customer Profile
        if (status === 'SEATED') {
            try {
                const profile = await this.crmService.identify({
                    email: booking.guestEmail ?? undefined,
                    phone: booking.guestPhone ?? undefined
                });
                
                if (profile) {
                    await (this.prisma as any).customerProfile.update({
                        where: { id: profile.id },
                        data: {
                            visitCount: { increment: 1 },
                            lastInteraction: new Date(),
                            lifecycleStage: 'CUSTOMER'
                        }
                    });
                }
            } catch (err) {
                this.logger.error(`Error updating CRM profile on seat: ${err.message}`);
            }
        }

        // Sync with CRM
        this.crmIntegrationService.syncRestaurantBooking(booking.id, 'UPDATED').catch(err => {
            this.logger.error(`Error syncing updated booking ${booking.id} to CRM:`, err);
        });

        // NEW: Send Status Notifications
        if (booking.guestEmail) {
            if (status === 'CONFIRMED') {
                this.mailService.sendRestaurantNotification(booking, 'confirmed').catch(err => this.logger.error(`Error sending confirm email:`, err));
            } else if (status === 'CANCELLED') {
                this.mailService.sendRestaurantNotification(booking, 'cancelled').catch(err => this.logger.error(`Error sending cancel email:`, err));
            }
        }


        // Trigger dynamic adaptation only when a table is freed (cancel / no-show).
        if (status === 'CANCELLED' || status === 'NO_SHOW') {
            this.autoAssignPendingBookings(booking.restaurantId, booking.date).catch(err => {
                this.logger.error(`Error in dynamic adaptation for restaurant ${booking.restaurantId}:`, err);
            });
        }

        return booking;
    }


    async getBookings(restaurantId: string, dateStr?: string, startDateStr?: string, endDateStr?: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const { timezone } = await this.getRestaurantConfig(restaurantId);
        let start: Date;
        let end: Date;

        if (startDateStr && endDateStr) {
            start = zonedDayRangeUtc(toDateOnlyString(startDateStr), timezone).start;
            end = zonedDayRangeUtc(toDateOnlyString(endDateStr), timezone).end;
        } else {
            const day = toDateOnlyString(dateStr || new Date());
            ({ start, end } = zonedDayRangeUtc(day, timezone));
        }

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: start, lte: end }
            },
            include: {
                table: { include: { zone: true } },
                review: { select: { serviceScore: true, ambianceScore: true, foodScore: true, advice: true, createdAt: true, redirectedToGoogle: true } },
            },
            orderBy: { date: 'asc' }
        });

        // Batch load all guest stats in a single query
        const guestStatsMap = await this.getBatchGuestStats(
            bookings.map(b => ({ email: b.guestEmail, phone: b.guestPhone }))
        );

        // Attach stats to bookings
        for (const booking of bookings) {
            const key = booking.guestEmail || booking.guestPhone || '';
            const stats = guestStatsMap.get(key) || { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancelledOrNoShowRate: 0 };
            (booking as any).visitCount = stats.visitCount;
            (booking as any).guestStats = stats;
        }

        return bookings;
    }

    // --- Waitlist ---
    async addToWaitlist(restaurantId: string, data: any, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.restaurantWaitlist.create({
            data: {
                restaurantId,
                date: new Date(data.date),
                pax: data.pax,
                name: data.name,
                email: data.email,
                phone: data.phone,
                notes: data.notes
            }
        });
    }

    async getWaitlist(restaurantId: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.restaurantWaitlist.findMany({
            where: { restaurantId, status: { in: ['WAITING', 'NOTIFIED'] } },
            orderBy: { createdAt: 'desc' }
        });
    }

    // --- Shifts & Slots (Synergy) ---
    async getShifts(restaurantId: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.shift.findMany({
            where: { restaurantId, isActive: true }
        });
    }

    async createShift(restaurantId: string, data: any, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        try {
            return await this.prisma.shift.create({
                data: { ...data, restaurantId }
            });
        } catch (error) {
            this.logger.error(`Error creating shift in restaurant ${restaurantId}`, error as Error);
            const message = error instanceof Error ? error.message : 'Error desconocido';
            throw new Error(`Error de base de datos: ${message}`);
        }
    }

    getAvailableSlots(restaurantId: string, dateStr: string, pax: number, type?: string) {
        return this.availability.getAvailableSlots(restaurantId, dateStr, pax, type);
    }

    async createLinkedReservation(data: {
        bookingId: string;
        restaurantId: string;
        date: string;
        time: string;
        pax: number;
        name: string;
        email: string;
    }, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, data.restaurantId);
        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantConfig(data.restaurantId);
        const dayStr = toDateOnlyString(data.date);
        const start = zonedDateToUtc(dayStr, data.time, timezone);

        return this.prisma.$transaction(async (tx) => {
            const created = await tx.resBooking.create({
                data: {
                    restaurantId: data.restaurantId,
                    hotelBookingId: data.bookingId,
                    date: start,
                    pax: data.pax,
                    guestName: data.name,
                    guestEmail: data.email,
                    isMealPlan: true,
                    status: 'CONFIRMED',
                    origin: ResBookingOrigin.MANUAL
                }
            });

            if (data.pax <= 12) {
                const cluster = await this.availability.findAvailableCluster(data.restaurantId, start, data.pax, defaultDuration, tx, bufferMinutes);
                if (cluster) {
                    return tx.resBooking.update({
                        where: { id: created.id },
                        data: {
                            tableId: cluster.tableId,
                            metadata: { ...(created.metadata as any || {}), linkedTableIds: cluster.linkedTableIds }
                        }
                    });
                }
                this.logger.warn(`createLinkedReservation ${created.id}: sin mesa libre.`);
            }
            return created;
        });
    }

    async confirmReservation(id: string) {
        return this.updateBookingStatus(id, 'CONFIRMED');
    }

    async cancelReservation(id: string) {
        return this.updateBookingStatus(id, 'CANCELLED');
    }

    // --- Public self-service (modify / cancel desde el email) ---

    private async findBookingByIdAndToken(id: string, token: string) {
        if (!id || !token) throw new BadRequestException('Faltan parámetros.');
        const booking = await this.prisma.resBooking.findUnique({
            where: { id },
            include: { restaurant: { select: { id: true, name: true, contactEmail: true } } }
        });
        if (!booking || !booking.modifyToken || booking.modifyToken !== token) {
            throw new NotFoundException('Reserva no encontrada.');
        }
        return booking;
    }

    private ensureWithinEditCutoff(date: Date) {
        const minutesUntil = (new Date(date).getTime() - Date.now()) / 60000;
        if (minutesUntil < PUBLIC_EDIT_CUTOFF_MINUTES) {
            throw new ForbiddenException(`Las reservas solo pueden modificarse o cancelarse con al menos ${PUBLIC_EDIT_CUTOFF_MINUTES / 60}h de antelación.`);
        }
    }

    async getPublicReservation(id: string, token: string) {
        const booking = await this.findBookingByIdAndToken(id, token);
        const { timezone } = await this.getRestaurantConfig(booking.restaurantId);

        const isCancelled = booking.status === $Enums.ResBookingStatus.CANCELLED;
        const minutesUntil = (booking.date.getTime() - Date.now()) / 60000;
        const editable = !isCancelled && minutesUntil >= PUBLIC_EDIT_CUTOFF_MINUTES;

        return {
            id: booking.id,
            status: booking.status,
            date: booking.date,
            pax: booking.pax,
            notes: booking.notes,
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            restaurantId: booking.restaurantId,
            restaurantName: booking.restaurant.name,
            restaurantTimezone: timezone,
            editable,
            editCutoffMinutes: PUBLIC_EDIT_CUTOFF_MINUTES
        };
    }

    async updatePublicReservation(id: string, token: string, body: { date?: string; time?: string; pax?: number; notes?: string }) {
        const booking = await this.findBookingByIdAndToken(id, token);
        if (booking.status === $Enums.ResBookingStatus.CANCELLED) {
            throw new BadRequestException('La reserva está cancelada.');
        }
        this.ensureWithinEditCutoff(booking.date);

        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantConfig(booking.restaurantId);

        const changingSlot = body.date != null || body.time != null || (body.pax != null && body.pax !== booking.pax);
        let newStart = booking.date;
        const newPax = body.pax ?? booking.pax;

        if (changingSlot) {
            if (!body.date || !body.time) {
                throw new BadRequestException('Para cambiar el horario hay que enviar date y time.');
            }
            const dayStr = toDateOnlyString(body.date);
            newStart = zonedDateToUtc(dayStr, body.time, timezone);
            this.ensureWithinEditCutoff(newStart);

            const opening = await this.prisma.restaurantOpening.findFirst({
                where: {
                    restaurantId: booking.restaurantId,
                    date: { lte: newStart },
                    OR: [
                        { endDate: null, date: { equals: newStart } },
                        { endDate: { gte: newStart } }
                    ]
                }
            });
            if (!opening) {
                const closures = await this.prisma.restaurantClosure.findMany({
                    where: {
                        restaurantId: booking.restaurantId,
                        date: { lte: newStart },
                        OR: [
                            { endDate: null, date: { equals: newStart } },
                            { endDate: { gte: newStart } }
                        ]
                    }
                });
                if (closures.length > 0) {
                    throw new BadRequestException('Restaurante cerrado en la nueva fecha.');
                }
            }

            if (newPax <= 12) {
                const preCheck = await this.availability.findAvailableCluster(
                    booking.restaurantId, newStart, newPax, defaultDuration, this.prisma, bufferMinutes, booking.id
                );
                if (!preCheck) {
                    throw new BadRequestException('No hay disponibilidad para la nueva fecha/hora.');
                }
            }
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const data: any = {};
            if (changingSlot) {
                data.date = newStart;
                data.tableId = null;
                data.metadata = { ...((booking.metadata as any) || {}), linkedTableIds: [] };
            }
            if (body.pax != null) data.pax = body.pax;
            if (body.notes !== undefined) data.notes = body.notes;

            const result = await tx.resBooking.update({ where: { id: booking.id }, data });

            if (changingSlot && newPax <= 12) {
                const cluster = await this.availability.findAvailableCluster(
                    booking.restaurantId, newStart, newPax, defaultDuration, tx, bufferMinutes, booking.id
                );
                if (cluster) {
                    return tx.resBooking.update({
                        where: { id: booking.id },
                        data: {
                            tableId: cluster.tableId,
                            metadata: { ...((result.metadata as any) || {}), linkedTableIds: cluster.linkedTableIds }
                        }
                    });
                }
                this.logger.warn(`updatePublicReservation ${booking.id}: sin mesa libre tras pre-check (race).`);
            }
            return result;
        });

        this.crmIntegrationService.syncRestaurantBooking(updated.id, 'UPDATED').catch(err => {
            this.logger.error(`Error syncing updated booking ${updated.id} to CRM:`, err);
        });

        if (updated.guestEmail) {
            this.mailService.sendRestaurantNotification(updated, 'modified').catch(err => {
                this.logger.error(`Error sending modified email for booking ${updated.id}:`, err);
            });
        }

        return updated;
    }

    async cancelPublicReservation(id: string, token: string) {
        const booking = await this.findBookingByIdAndToken(id, token);
        if (booking.status === $Enums.ResBookingStatus.CANCELLED) {
            return booking;
        }
        this.ensureWithinEditCutoff(booking.date);
        return this.updateBookingStatus(booking.id, 'CANCELLED');
    }

    async createPublicReservation(data: any) {
        if (!data?.time) {
            throw new BadRequestException('Falta el campo "time" (HH:mm) en la reserva.');
        }
        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantConfig(data.restaurantId);
        const dayStr = toDateOnlyString(data.date);
        const start = zonedDateToUtc(dayStr, data.time, timezone);

        // Pre-check: cierres del restaurante. Una apertura excepcional para esa fecha anula el cierre.
        const opening = await this.prisma.restaurantOpening.findFirst({
            where: {
                restaurantId: data.restaurantId,
                date: { lte: start },
                OR: [
                    { endDate: null, date: { equals: start } },
                    { endDate: { gte: start } }
                ]
            }
        });
        if (!opening) {
            const closures = await this.prisma.restaurantClosure.findMany({
                where: {
                    restaurantId: data.restaurantId,
                    date: { lte: start },
                    OR: [
                        { endDate: null, date: { equals: start } },
                        { endDate: { gte: start } }
                    ]
                }
            });
            if (closures.length > 0) {
                throw new BadRequestException('Restaurante cerrado en la fecha solicitada.');
            }
        }

        // Pre-check: disponibilidad para grupos ≤ 12 (los grandes se gestionan a mano).
        if (data.pax <= 12) {
            const preCheck = await this.availability.findAvailableCluster(
                data.restaurantId, start, data.pax, defaultDuration, this.prisma, bufferMinutes
            );
            if (!preCheck) {
                throw new BadRequestException('No hay disponibilidad para la hora solicitada.');
            }
        }

        const booking = await this.prisma.$transaction(async (tx) => {
            const created = await tx.resBooking.create({
                data: {
                    restaurantId: data.restaurantId,
                    date: start,
                    pax: data.pax,
                    guestName: data.guestName || data.name,
                    guestEmail: data.guestEmail || data.email,
                    guestPhone: data.guestPhone || data.phone,
                    guestSurname2: data.guestSurname2 || data.surname2,
                    guestAge: data.guestAge || data.age,
                    guestGender: data.guestGender || data.gender,
                    guestWhatsapp: data.guestWhatsapp || data.whatsapp,
                    instagram: data.instagram,
                    facebook: data.facebook,
                    tiktok: data.tiktok,
                    linkedin: data.linkedin,
                    xTwitter: data.xTwitter,
                    notes: data.notes,
                    status: $Enums.ResBookingStatus.PENDING_CONFIRMATION,
                    origin: ResBookingOrigin.WEB,
                    stripePaymentMethodId: data.paymentMethodId,
                    modifyToken: randomBytes(24).toString('hex')
                }
            });

            if (data.pax <= 12) {
                const cluster = await this.availability.findAvailableCluster(data.restaurantId, start, data.pax, defaultDuration, tx, bufferMinutes);
                if (cluster) {
                    return tx.resBooking.update({
                        where: { id: created.id },
                        data: {
                            tableId: cluster.tableId,
                            metadata: { ...(created.metadata as any || {}), linkedTableIds: cluster.linkedTableIds }
                        }
                    });
                }
                this.logger.warn(`createPublicReservation ${created.id}: sin mesa libre tras pre-check (race).`);
            }
            return created;
        });

        // Identify Guest in CRM
        this.crmService.identify({
            email: booking.guestEmail ?? undefined,
            phone: booking.guestPhone ?? undefined,
            firstName: booking.guestName.split(' ')[0],
            lastName: booking.guestName.split(' ').slice(1).join(' ')
        }).catch(err => this.logger.error(`Error identifying guest in CRM: ${err.message}`));
        
        // Sync with CRM
        this.crmIntegrationService.syncRestaurantBooking(booking.id).catch(err => {
            this.logger.error(`Error syncing booking ${booking.id} to CRM:`, err);
        });

        // NEW: Send Confirmation Email (If guest has email)
        if (booking.guestEmail) {
            this.mailService.sendRestaurantNotification(booking, 'created').catch(err => {
                this.logger.error(`Error sending confirmation email for booking ${booking.id}:`, err);
            });
        }
        
        return booking;

    }

    async deleteShift(id: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForShift(id));
        return this.prisma.shift.delete({
            where: { id }
        });
    }

    async getClosures(restaurantId: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.restaurantClosure.findMany({
            where: { restaurantId },
            orderBy: { date: 'asc' }
        });
    }

    async createClosure(restaurantId: string, data: { date: string, endDate?: string, reason?: string }, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.restaurantClosure.create({
            data: {
                restaurantId,
                date: new Date(data.date),
                endDate: data.endDate ? new Date(data.endDate) : null,
                reason: data.reason
            }
        });
    }

    async deleteClosure(id: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForClosure(id));
        return this.prisma.restaurantClosure.delete({
            where: { id }
        });
    }

    async getOpenings(restaurantId: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.restaurantOpening.findMany({
            where: { restaurantId },
            orderBy: { date: 'asc' }
        });
    }

    async createOpening(
        restaurantId: string,
        data: {
            date: string;
            endDate?: string;
            reason?: string;
            shiftIds?: string[];
            customShifts?: Array<{ name: string; type: string; startTime: string; endTime: string; slotInterval: number }>;
        },
        user?: AuthenticatedUser
    ) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        if (!data.date) throw new BadRequestException('La fecha es obligatoria');

        const shiftIds = Array.isArray(data.shiftIds) ? data.shiftIds.filter(Boolean) : [];
        const customShifts = Array.isArray(data.customShifts) ? data.customShifts : [];

        if (shiftIds.length === 0 && customShifts.length === 0) {
            throw new BadRequestException('Selecciona al menos un turno existente o define uno puntual');
        }

        if (shiftIds.length > 0) {
            const shifts = await this.prisma.shift.findMany({
                where: { restaurantId, id: { in: shiftIds } },
                select: { id: true }
            });
            if (shifts.length !== shiftIds.length) {
                throw new BadRequestException('Alguno de los turnos no pertenece a este restaurante');
            }
        }

        const validTypes = new Set(['BREAKFAST', 'LUNCH', 'DINNER']);
        const timeRe = /^\d{2}:\d{2}$/;
        for (const cs of customShifts) {
            if (!cs.name || !cs.type || !cs.startTime || !cs.endTime) {
                throw new BadRequestException('Cada turno puntual necesita nombre, tipo, hora inicio y hora fin');
            }
            if (!validTypes.has(cs.type)) {
                throw new BadRequestException(`Tipo de turno no válido: ${cs.type}`);
            }
            if (!timeRe.test(cs.startTime) || !timeRe.test(cs.endTime)) {
                throw new BadRequestException('Las horas deben tener formato HH:mm');
            }
            if (cs.startTime >= cs.endTime) {
                throw new BadRequestException(`Turno "${cs.name}": la hora de inicio debe ser anterior a la de fin`);
            }
            if (!cs.slotInterval || cs.slotInterval < 5 || cs.slotInterval > 240) {
                throw new BadRequestException(`Turno "${cs.name}": intervalo de slots fuera de rango (5-240 min)`);
            }
        }

        return this.prisma.restaurantOpening.create({
            data: {
                restaurantId,
                date: new Date(data.date),
                endDate: data.endDate ? new Date(data.endDate) : null,
                reason: data.reason,
                shiftIds: shiftIds.join(','),
                customShifts: customShifts.length > 0 ? customShifts : undefined
            }
        });
    }

    async deleteOpening(id: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForOpening(id));
        return this.prisma.restaurantOpening.delete({
            where: { id }
        });
    }

    // --- Access (delegated to RestaurantAccessService) ---

    getAuthorizedUsers(restaurantId: string, user?: AuthenticatedUser) {
        return this.access.getAuthorizedUsers(restaurantId, user);
    }

    authorizeUser(restaurantId: string, data: { email: string; password?: string; role?: string; permissions?: string[] }, user?: AuthenticatedUser) {
        return this.access.authorizeUser(restaurantId, data, user);
    }

    deauthorizeUser(restaurantId: string, userId: string, user?: AuthenticatedUser) {
        return this.access.deauthorizeUser(restaurantId, userId, user);
    }

    getAccessProfiles(restaurantId: string, user?: AuthenticatedUser) {
        return this.access.getAccessProfiles(restaurantId, user);
    }

    createAccessProfile(restaurantId: string, data: { name: string; baseRole?: string; permissions: string[] }, user?: AuthenticatedUser) {
        return this.access.createAccessProfile(restaurantId, data, user);
    }

    updateAccessProfile(profileId: string, data: { name?: string; baseRole?: string; permissions?: string[] }, user?: AuthenticatedUser) {
        return this.access.updateAccessProfile(profileId, data, user);
    }

    deleteAccessProfile(profileId: string, user?: AuthenticatedUser) {
        return this.access.deleteAccessProfile(profileId, user);
    }

    async autoAssignPendingBookings(restaurantId: string, date: Date) {
        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantConfig(restaurantId);
        const dayStr = toDateOnlyString(date);
        const { start: startOfDay, end: endOfDay } = zonedDayRangeUtc(dayStr, timezone);

        const pendingBookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                tableId: null,
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.NO_SHOW] }
            },
            orderBy: { pax: 'desc' }
        });

        if (pendingBookings.length === 0) return;

        this.logger.log(`Attempting to auto-assign ${pendingBookings.length} pending bookings for ${dayStr}`);

        for (const booking of pendingBookings) {
            if (booking.pax > 12) continue;

            const cluster = await this.availability.findAvailableCluster(restaurantId, new Date(booking.date), booking.pax, defaultDuration, this.prisma, bufferMinutes);
            if (cluster) {
                await this.prisma.resBooking.update({
                    where: { id: booking.id },
                    data: {
                        tableId: cluster.tableId,
                        metadata: { ...(booking.metadata as any || {}), linkedTableIds: cluster.linkedTableIds }
                    }
                });
                this.logger.log(`Auto-assigned booking ${booking.id} to ${cluster.tableId} (cluster size ${cluster.linkedTableIds.length + 1})`);
            }
        }
    }
}
