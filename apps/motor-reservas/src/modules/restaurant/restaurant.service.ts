import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { WaitlistService } from './waitlist.service';
import { CrmService } from '../crm/crm.service';
import { CrmIntegrationService } from '../crm/crm-integration.service';
import { MailService } from '../mail/mail.service';
import { ShiftType, ResBookingOrigin, UserRole, ResBookingStatus } from '../../common/enums';
import { $Enums, Prisma } from '@prisma/client';
import { getUserScope, assertRestaurantAccess, ensureRestaurantAccess, ensureHotelAccess } from '../../common/scope';
import { zonedDateToUtc, zonedDayRangeUtc, toDateOnlyString } from '../../common/timezone';

type TxOrPrisma = PrismaService | Prisma.TransactionClient;

@Injectable()
export class RestaurantService {
    private readonly logger = new Logger(RestaurantService.name);

    constructor(
        private prisma: PrismaService,
        private waitlistService: WaitlistService,
        private crmService: CrmService,
        private crmIntegrationService: CrmIntegrationService,
        private mailService: MailService
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
    private async ensureZoneAccess(user: any, zoneId: string): Promise<void> {
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

    /** Resuelve el restaurantId al que pertenece un ResBooking. */
    private async restaurantIdForBooking(bookingId: string): Promise<string> {
        const b = await this.prisma.resBooking.findUnique({
            where: { id: bookingId },
            select: { restaurantId: true }
        });
        if (!b) throw new NotFoundException('Reserva no encontrada');
        return b.restaurantId;
    }

    private async getRestaurantTzAndDuration(restaurantId: string): Promise<{ timezone: string; defaultDuration: number; bufferMinutes: number }> {
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

    /** Resuelve el restaurantId al que pertenece un AccessProfile. */
    private async restaurantIdForAccessProfile(profileId: string): Promise<string> {
        const p = await (this.prisma as any).accessProfile.findUnique({
            where: { id: profileId },
            select: { restaurantId: true }
        });
        if (!p) throw new NotFoundException('Perfil de acceso no encontrado');
        return p.restaurantId;
    }

    /**
     * Sanitiza datos sensibles del mailConfig antes de devolverlos en respuestas.
     * Quita contraseñas SMTP, Client Secrets, etc.
     * Mantiene la presencia de los campos (true/false) para que el admin sepa si está configurado.
     */
    private sanitizeMailConfig(restaurant: any): any {
        if (!restaurant) return restaurant;
        const cfg = restaurant.mailConfig;
        if (!cfg) return restaurant;
        const sanitized: any = {
            host: cfg.host || '',
            port: cfg.port || '',
            user: cfg.user || '',
            from: cfg.from || '',
            notificationsEnabled: cfg.notificationsEnabled !== false,
            // No exponer la contraseña; solo si está configurada
            passConfigured: !!(cfg.pass && cfg.pass.length > 0),
        };
        if (cfg.graph) {
            sanitized.graph = {
                tenantId: cfg.graph.tenantId || '',
                clientId: cfg.graph.clientId || '',
                senderEmail: cfg.graph.senderEmail || '',
                clientSecretConfigured: !!(cfg.graph.clientSecret && cfg.graph.clientSecret.length > 0),
            };
        }
        return { ...restaurant, mailConfig: sanitized };
    }

    async getRestaurants(user?: any) {
        const scope = await getUserScope(user, this.prisma);
        const restaurants = await this.prisma.restaurant.findMany({
            where: scope.restaurantIds === null ? {} : { id: { in: scope.restaurantIds } },
            include: { zones: true }
        });
        return restaurants.map(r => this.sanitizeMailConfig(r));
    }

    async getRestaurant(id: string, user?: any) {
        if (user) {
            const scope = await getUserScope(user, this.prisma);
            assertRestaurantAccess(scope, id);
        }
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
            include: { hotel: true, widgetConfig: true, shifts: true }
        });
        return this.sanitizeMailConfig(restaurant);
    }


    async updateRestaurant(id: string, data: any, user?: any) {
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


    async deleteRestaurant(id: string, user?: any) {
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

    // --- Visual Plan & Zones ---
    async syncZones(restaurantId: string, zones: any[], user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        for (const z of zones) {
            if (z.id && z.id.length > 10) {
                await this.prisma.zone.update({ where: { id: z.id }, data: { name: z.name, index: z.index, isActive: z.isActive } });
            } else {
                await this.prisma.zone.create({ data: { restaurantId, name: z.name, index: z.index } });
            }
        }
        return this.getTables(restaurantId);
    }

    async createZone(restaurantId: string, name: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.zone.create({
            data: { restaurantId, name }
        });
    }

    // --- Tables ---
    async syncTables(zoneId: string, tables: any[], user?: any) {
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

    async createTable(zoneId: string, name: string, capacity: number, user?: any) {
        if (user) await this.ensureZoneAccess(user, zoneId);
        return this.prisma.table.create({
            data: { zoneId, name, capacity }
        });
    }

    async getGuestStats(email?: string | null, phone?: string | null) {
        if (!email && !phone) return { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancellationRate: 0 };

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

        const totalBookings = bookings.length;
        const visitCount = bookings.filter(b => b.status === 'SEATED').length;
        const cancelledCount = bookings.filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length;

        // Find first reservation date
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
            cancellationRate: totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0
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
                statsMap.set(key, { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancellationRate: 0 });
                continue;
            }

            const guestBookings = allBookings.filter(b =>
                (guest.email && b.guestEmail === guest.email) ||
                (guest.phone && b.guestPhone === guest.phone)
            );

            const totalBookings = guestBookings.length;
            const visitCount = guestBookings.filter(b => b.status === 'SEATED').length;
            const cancelledCount = guestBookings.filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length;

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
                cancellationRate: totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0
            });
        }

        return statsMap;
    }

    async getTables(restaurantId: string, dateStr?: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const { timezone } = await this.getRestaurantTzAndDuration(restaurantId);
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
            const stats = guestStatsMap.get(key) || { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancellationRate: 0 };
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
    async updateBooking(id: string, data: any, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForBooking(id));
        return this.prisma.resBooking.update({
            where: { id },
            data,
            include: { table: { include: { zone: true } } }
        });
    }

    async createBooking(data: any, user?: any) {
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
                const { defaultDuration, bufferMinutes } = await this.getRestaurantTzAndDuration(created.restaurantId);
                const cluster = await this.findAvailableCluster(
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

    private async findAvailableCluster(
        restaurantId: string,
        date: Date,
        pax: number,
        duration: number,
        client: TxOrPrisma = this.prisma,
        bufferMinutes: number = 0
    ): Promise<{ tableId: string; linkedTableIds: string[] } | null> {
        // Use a day window aligned to the date instant for booking lookup. Day-civil
        // alignment is unnecessary here — we only need the booking set covering the
        // slot window. ±1 day is conservatively safe for any TZ.
        const startOfDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        // Events that block specific zones on this date
        const dayEvents = await client.event.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                isActive: true
            },
            include: { zones: { select: { id: true } } }
        });
        const blockedZoneIds = dayEvents.flatMap(e => e.zones.map(z => z.id));

        const tables = await client.table.findMany({
            where: {
                zone: {
                    restaurantId,
                    id: blockedZoneIds.length > 0 ? { notIn: blockedZoneIds } : undefined
                },
                isActive: true
            }
        });

        const bookings = await client.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] }
            },
            select: { id: true, date: true, duration: true, tableId: true, metadata: true }
        });

        const bufMs = bufferMinutes * 60000;
        const slotEnd = new Date(date.getTime() + duration * 60000);
        const isTableBookedNow = (tableId: string) => bookings.some(b => {
            const bStart = new Date(b.date);
            const bEnd = new Date(bStart.getTime() + (b.duration || duration) * 60000);
            // overlap con buffer: b.start < new.end + buffer && b.end + buffer > new.start
            if (!(bStart.getTime() < slotEnd.getTime() + bufMs && bEnd.getTime() + bufMs > date.getTime())) return false;
            if (b.tableId === tableId) return true;
            const meta = (b.metadata as any) || {};
            const linked: string[] = Array.isArray(meta.linkedTableIds) ? meta.linkedTableIds : [];
            return linked.includes(tableId);
        });

        const freeTables = tables.filter(t => !isTableBookedNow(t.id));

        // 1) Single table — smallest that fits (and respects minPax/maxPax)
        const singleCandidate = freeTables
            .filter(t => t.maxPax >= pax && t.minPax <= pax)
            .sort((a, b) => a.maxPax - b.maxPax)[0];
        if (singleCandidate) return { tableId: singleCandidate.id, linkedTableIds: [] };

        // 2) Cluster of contiguous tables
        let best: { ids: string[]; capacity: number } | null = null;
        for (const start of freeTables) {
            const cluster = this.buildClusterForPax(start, freeTables, pax);
            if (cluster && (!best || cluster.ids.length < best.ids.length)) {
                best = cluster;
            }
        }
        if (!best || best.ids.length === 0) return null;

        const [head, ...rest] = best.ids;
        return { tableId: head, linkedTableIds: rest };
    }

    private buildClusterForPax(startTable: any, freeTables: any[], targetPax: number): { ids: string[]; capacity: number } | null {
        const visited = new Set<string>();
        const cluster: any[] = [startTable];
        visited.add(startTable.id);

        const capacityOf = (members: any[]): number => {
            let cap = 0;
            for (const t of members) {
                const meta = (t.metadata as any) || {};
                const neighborsInCluster = (meta.contiguousTableIds || [])
                    .filter((id: string) => members.some(m => m.id === id)).length;
                cap += Math.max(0, t.maxPax - neighborsInCluster * (t.seatsLostPerJoin || 1));
            }
            return cap;
        };

        let head = 0;
        while (head < cluster.length) {
            if (capacityOf(cluster) >= targetPax) {
                return { ids: cluster.map(t => t.id), capacity: capacityOf(cluster) };
            }
            const table = cluster[head++];
            const meta = (table.metadata as any) || {};
            const neighborIds: string[] = meta.contiguousTableIds || [];
            for (const nId of neighborIds) {
                if (visited.has(nId)) continue;
                const neighbor = freeTables.find(t => t.id === nId);
                if (neighbor) {
                    visited.add(nId);
                    cluster.push(neighbor);
                }
            }
        }
        if (capacityOf(cluster) >= targetPax) {
            return { ids: cluster.map(t => t.id), capacity: capacityOf(cluster) };
        }
        return null;
    }

    async updateBookingStatus(bookingId: string, status: string, tableId?: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForBooking(bookingId));
        const updateData: any = { status };
        if (tableId) updateData.tableId = tableId;
        
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


    async getBookings(restaurantId: string, dateStr?: string, startDateStr?: string, endDateStr?: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const { timezone } = await this.getRestaurantTzAndDuration(restaurantId);
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
            include: { table: { include: { zone: true } } },
            orderBy: { date: 'asc' }
        });

        // Batch load all guest stats in a single query
        const guestStatsMap = await this.getBatchGuestStats(
            bookings.map(b => ({ email: b.guestEmail, phone: b.guestPhone }))
        );

        // Attach stats to bookings
        for (const booking of bookings) {
            const key = booking.guestEmail || booking.guestPhone || '';
            const stats = guestStatsMap.get(key) || { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancellationRate: 0 };
            (booking as any).visitCount = stats.visitCount;
            (booking as any).guestStats = stats;
        }

        return bookings;
    }

    // --- Waitlist ---
    async addToWaitlist(restaurantId: string, data: any, user?: any) {
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

    async getWaitlist(restaurantId: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.restaurantWaitlist.findMany({
            where: { restaurantId, status: { in: ['WAITING', 'NOTIFIED'] } },
            orderBy: { createdAt: 'desc' }
        });
    }

    // --- Shifts & Slots (Synergy) ---
    async getShifts(restaurantId: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.shift.findMany({
            where: { restaurantId, isActive: true }
        });
    }

    async createShift(restaurantId: string, data: any, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        try {
            return await this.prisma.shift.create({
                data: { ...data, restaurantId }
            });
        } catch (error: any) {
            console.error('Error creating shift:', error);
            throw new Error(`Error de base de datos: ${error.message || 'Error desconocido'}`);
        }
    }

    async getAvailableSlots(restaurantId: string, dateStr: string, pax: number, type?: string) {
        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantTzAndDuration(restaurantId);
        const dayStr = toDateOnlyString(dateStr);
        const { start: startOfDay, end: endOfDay } = zonedDayRangeUtc(dayStr, timezone);

        const todayStr = toDateOnlyString(new Date());
        if (dayStr < todayStr) {
            return { slots: [], closed: true, message: 'Fecha pasada' };
        }

        // dayOfWeek según la zona del restaurante (el inicio del día UTC es el midnight local del restaurante)
        const dayOfWeek = new Date(
            startOfDay.toLocaleString('en-US', { timeZone: timezone })
        ).getDay();

        const shifts = await this.prisma.shift.findMany({
            where: {
                restaurantId,
                isActive: true,
                ...(type ? { type: type as ShiftType } : {})
            }
        });

        const activeShifts = shifts.filter(s => {
            const days = s.daysOfWeek.split(',').map(d => d.trim());
            return days.includes(dayOfWeek.toString());
        });

        if (activeShifts.length === 0) {
            return { slots: [], closed: true, message: 'No hay turnos para este día' };
        }

        // Check for events on this date and their blocked zones
        const dayEvents = await this.prisma.event.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                isActive: true
            },
            include: {
                zones: true,
                _count: { select: { bookings: true } }
            }
        });

        const blockedZoneIds = dayEvents.flatMap(e => e.zones.map(z => z.id));

        const tables = await this.prisma.table.findMany({
            where: {
                zone: {
                    restaurantId,
                    id: blockedZoneIds.length > 0 ? { notIn: blockedZoneIds } : undefined
                },
                isActive: true
            }
        });

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] }
            },
            select: { id: true, date: true, duration: true, tableId: true, metadata: true }
        });

        const availableSlots: string[] = [];
        const now = new Date();

        for (const shift of activeShifts) {
            const slots = this.generateSlots(shift.startTime, shift.endTime, shift.slotInterval);

            for (const slot of slots) {
                const slotTime = zonedDateToUtc(dayStr, slot, timezone);

                if (dayStr === todayStr && slotTime < now) continue;

                if (this.isSlotAvailable(slotTime, pax, tables, bookings, defaultDuration, bufferMinutes)) {
                    if (!availableSlots.includes(slot)) {
                        availableSlots.push(slot);
                    }
                }
            }
        }

        return {
            slots: availableSlots,
            closed: activeShifts.length === 0,
            event: dayEvents[0] || null
        };
    }

    private isSlotAvailable(slotTime: Date, pax: number, tables: any[], bookings: any[], defaultDuration: number = 90, bufferMinutes: number = 0): boolean {
        const bufMs = bufferMinutes * 60000;
        const freeTables = tables.filter(table => {
            const isBooked = bookings.some(b => {
                const matchesTable = b.tableId === table.id ||
                    (Array.isArray(((b.metadata as any) || {}).linkedTableIds) && ((b.metadata as any).linkedTableIds as string[]).includes(table.id));
                if (!matchesTable) return false;
                const bStart = new Date(b.date);
                const bEnd = new Date(bStart.getTime() + (b.duration || defaultDuration) * 60000);
                const slotEnd = new Date(slotTime.getTime() + defaultDuration * 60000);
                return (bStart.getTime() < slotEnd.getTime() + bufMs && bEnd.getTime() + bufMs > slotTime.getTime());
            });
            return !isBooked;
        });

        const singleTable = freeTables.find(t => t.maxPax >= pax && t.minPax <= pax);
        if (singleTable) return true;

        for (const startTable of freeTables) {
            if (this.buildClusterForPax(startTable, freeTables, pax)) {
                return true;
            }
        }

        return false;
    }

    private generateSlots(startStr: string, endStr: string, interval: number): string[] {
        const slots: string[] = [];
        let [h, m] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);

        while (h < eh || (h === eh && m < em)) {
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            m += interval;
            if (m >= 60) {
                h += Math.floor(m / 60);
                m = m % 60;
            }
        }
        return slots;
    }

    async createLinkedReservation(data: {
        bookingId: string;
        restaurantId: string;
        date: string;
        time: string;
        pax: number;
        name: string;
        email: string;
    }, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, data.restaurantId);
        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantTzAndDuration(data.restaurantId);
        const dayStr = toDateOnlyString(data.date);
        const start = zonedDateToUtc(dayStr, data.time, timezone);

        const booking = await this.prisma.$transaction(async (tx) => {
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
                const cluster = await this.findAvailableCluster(data.restaurantId, start, data.pax, defaultDuration, tx, bufferMinutes);
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

        return booking;
    }

    async confirmReservation(id: string) {
        return this.updateBookingStatus(id, 'CONFIRMED');
    }

    async cancelReservation(id: string) {
        return this.updateBookingStatus(id, 'CANCELLED');
    }

    async createPublicReservation(data: any) {
        if (!data?.time) {
            throw new BadRequestException('Falta el campo "time" (HH:mm) en la reserva.');
        }
        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantTzAndDuration(data.restaurantId);
        const dayStr = toDateOnlyString(data.date);
        const start = zonedDateToUtc(dayStr, data.time, timezone);

        // Pre-check: ¿el slot solicitado es viable? Re-verificamos cierres y eventos antes de crear nada.
        const closures = await this.prisma.restaurantClosure.findMany({
            where: {
                restaurantId: data.restaurantId,
                date: { lte: start },
                OR: [{ endDate: null, date: { equals: start } }, { endDate: { gte: start } }]
            }
        });
        if (closures.length > 0) {
            throw new BadRequestException('Restaurante cerrado en la fecha solicitada.');
        }

        const preCheck = await this.findAvailableCluster(data.restaurantId, start, data.pax, defaultDuration, this.prisma, bufferMinutes);
        if (!preCheck && data.pax <= 12) {
            throw new BadRequestException('No hay disponibilidad para la hora solicitada.');
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
                    stripePaymentMethodId: data.paymentMethodId
                }
            });

            if (data.pax <= 12) {
                const cluster = await this.findAvailableCluster(data.restaurantId, start, data.pax, defaultDuration, tx, bufferMinutes);
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

    async deleteShift(id: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForShift(id));
        return this.prisma.shift.delete({
            where: { id }
        });
    }

    async getClosures(restaurantId: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.restaurantClosure.findMany({
            where: { restaurantId },
            orderBy: { date: 'asc' }
        });
    }

    async createClosure(restaurantId: string, data: { date: string, endDate?: string, reason?: string }, user?: any) {
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

    async deleteClosure(id: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForClosure(id));
        return this.prisma.restaurantClosure.delete({
            where: { id }
        });
    }

    async getAuthorizedUsers(restaurantId: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.user.findMany({
            where: { restaurantId },
            select: { id: true, email: true, name: true, role: true, permissions: true }
        });
    }

    async authorizeUser(restaurantId: string, data: { email: string, password?: string, role?: string, permissions?: string[] }, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const { password, role, permissions } = data;
        const email = data.email?.trim().toLowerCase();
        if (!email) {
            throw new Error('Email obligatorio');
        }

        // Hash password if provided. If absent on create, store a placeholder that no bcrypt.compare can match
        // (bcrypt.compare requires a $2a/$2b/$2y$ hash; an empty placeholder will always fail safely).
        const hashedPassword = password && password.length > 0
            ? await bcrypt.hash(password, 10)
            : undefined;

        const existingUser = await this.prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            return this.prisma.user.update({
                where: { email },
                data: {
                    restaurantId,
                    role: (role as UserRole) || existingUser.role,
                    ...(hashedPassword ? { password: hashedPassword } : {}),
                    permissions: permissions?.join(',') || existingUser.permissions
                }
            });
        }

        if (!hashedPassword) {
            throw new Error('Se requiere contraseña para crear un nuevo usuario');
        }

        return this.prisma.user.create({
            data: {
                email,
                restaurantId,
                password: hashedPassword,
                role: (role as UserRole) || UserRole.STAFF,
                permissions: permissions?.join(','),
            }
        });
    }

    async deauthorizeUser(restaurantId: string, userId: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                restaurantId: null,
                permissions: null
            }
        });
    }

    // --- Access Profiles (plantillas de roles por restaurante) ---
    async getAccessProfiles(restaurantId: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return (this.prisma as any).accessProfile.findMany({
            where: { restaurantId },
            orderBy: { createdAt: 'asc' }
        });
    }

    async createAccessProfile(restaurantId: string, data: { name: string; baseRole?: string; permissions: string[] }, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const name = data.name?.trim();
        if (!name) throw new Error('Nombre del perfil obligatorio');
        return (this.prisma as any).accessProfile.create({
            data: {
                restaurantId,
                name,
                baseRole: (data.baseRole as UserRole) || UserRole.STAFF,
                permissions: (data.permissions || []).join(',')
            }
        });
    }

    async updateAccessProfile(profileId: string, data: { name?: string; baseRole?: string; permissions?: string[] }, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForAccessProfile(profileId));
        const update: any = {};
        if (data.name !== undefined) update.name = data.name.trim();
        if (data.baseRole !== undefined) update.baseRole = data.baseRole as UserRole;
        if (data.permissions !== undefined) update.permissions = data.permissions.join(',');
        return (this.prisma as any).accessProfile.update({
            where: { id: profileId },
            data: update
        });
    }

    async deleteAccessProfile(profileId: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, await this.restaurantIdForAccessProfile(profileId));
        return (this.prisma as any).accessProfile.delete({
            where: { id: profileId }
        });
    }

    async autoAssignPendingBookings(restaurantId: string, date: Date) {
        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantTzAndDuration(restaurantId);
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

            const cluster = await this.findAvailableCluster(restaurantId, new Date(booking.date), booking.pax, defaultDuration, this.prisma, bufferMinutes);
            if (cluster) {
                await this.prisma.resBooking.update({
                    where: { id: booking.id },
                    data: {
                        tableId: cluster.tableId,
                        metadata: { ...(booking.metadata as any || {}), linkedTableIds: cluster.linkedTableIds }
                    }
                });
                this.logger.log(`Auto-assigned booking ${booking.id} to table ${cluster.tableId} (linked: ${cluster.linkedTableIds.length})`);
            }
        }
    }
}
