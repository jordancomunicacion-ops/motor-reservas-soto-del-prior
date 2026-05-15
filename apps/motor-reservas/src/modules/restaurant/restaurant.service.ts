import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WaitlistService } from './waitlist.service';
import { CrmService } from '../crm/crm.service';
import { CrmIntegrationService } from '../crm/crm-integration.service';
import { MailService } from '../mail/mail.service';
import { ResBookingOrigin, ResBookingStatus } from '../../common/enums';
import { $Enums } from '@prisma/client';
import { getUserScope, assertRestaurantAccess, ensureRestaurantAccess, ensureHotelAccess } from '../../common/scope';
import { RestaurantAvailabilityService } from './restaurant-availability.service';
import { RestaurantAccessService } from './restaurant-access.service';

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

        // Si llega mailConfig sanitizado (sin pass o clientSecret), preservar los del actual
        if (rest.mailConfig) {
            const existing = await this.prisma.restaurant.findUnique({ where: { id }, select: { mailConfig: true } });
            const currentCfg: any = existing?.mailConfig || {};
            const incoming: any = rest.mailConfig || {};
            // Pass SMTP: si no llega o llega vacío, mantener el actual
            if (!incoming.pass) {
                incoming.pass = currentCfg.pass;
            }
            // Graph clientSecret: si no llega o no se incluye el objeto graph entero, mantener
            if (incoming.graph) {
                if (!incoming.graph.clientSecret) {
                    incoming.graph.clientSecret = currentCfg.graph?.clientSecret;
                }
            } else if (currentCfg.graph) {
                incoming.graph = currentCfg.graph;
            }
            // Eliminar campos solo-lectura que vienen del sanitizer
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
        let start: Date;
        let end: Date;

        if (dateStr) {
            start = new Date(dateStr);
            start.setUTCHours(0, 0, 0, 0);
            end = new Date(dateStr);
            end.setUTCHours(23, 59, 59, 999);
        } else {
            start = new Date(new Date().setUTCHours(0, 0, 0, 0));
            end = new Date(new Date().setUTCHours(23, 59, 59, 999));
        }

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
        // Basic impl, can be expanded for validation
        const { name, ...rest } = data;
        const booking = await this.prisma.resBooking.create({ 
            data: {
                ...rest,
                guestName: data.guestName || name
            } 
        });

        // Auto-assign Table if not provided
        if (!booking.tableId && booking.restaurantId && booking.date) {
            const restaurant = await this.prisma.restaurant.findUnique({ where: { id: booking.restaurantId }, select: { defaultDuration: true } });
            const tableId = await this.findAvailableTable(booking.restaurantId, new Date(booking.date), booking.pax, restaurant?.defaultDuration || 90);
            if (tableId) {
                await this.prisma.resBooking.update({
                    where: { id: booking.id },
                    data: { tableId }
                });
            }
        }

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

    private findAvailableTable(restaurantId: string, date: Date, pax: number, duration: number): Promise<string | null> {
        return this.availability.findAvailableTable(restaurantId, date, pax, duration);
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


        // Trigger dynamic adaptation: try to assign other unassigned bookings
        this.autoAssignPendingBookings(booking.restaurantId, booking.date).catch(err => {
            this.logger.error(`Error in dynamic adaptation for restaurant ${booking.restaurantId}:`, err);
        });

        return booking;
    }


    async getBookings(restaurantId: string, dateStr?: string, startDateStr?: string, endDateStr?: string, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        let start: Date;
        let end: Date;

        if (startDateStr && endDateStr) {
            start = new Date(startDateStr);
            start.setUTCHours(0, 0, 0, 0);
            end = new Date(endDateStr);
            end.setUTCHours(23, 59, 59, 999);
        } else if (dateStr) {
            start = new Date(dateStr);
            start.setUTCHours(0, 0, 0, 0);
            end = new Date(dateStr);
            end.setUTCHours(23, 59, 59, 999);
        } else {
            // Default to today
            start = new Date();
            start.setUTCHours(0, 0, 0, 0);
            end = new Date();
            end.setUTCHours(23, 59, 59, 999);
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
    }, user?: any) {
        if (user) await ensureRestaurantAccess(user, this.prisma, data.restaurantId);
        const [hours, minutes] = data.time.split(':').map(Number);
        const start = new Date(data.date);
        start.setUTCHours(hours, minutes, 0, 0);

        const booking = await this.prisma.resBooking.create({
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

        // Auto-assign Table (only for groups of 12 or less)
        const restaurant = await this.prisma.restaurant.findUnique({ where: { id: data.restaurantId }, select: { defaultDuration: true } });
        let tableId: string | null = null;
        if (data.pax <= 12) {
            tableId = await this.findAvailableTable(data.restaurantId, start, data.pax, restaurant?.defaultDuration || 90);
        }
        if (tableId) {
            await this.prisma.resBooking.update({
                where: { id: booking.id },
                data: { tableId }
            });
        }

        return booking;
    }

    async confirmReservation(id: string) {
        return this.updateBookingStatus(id, 'CONFIRMED');
    }

    async cancelReservation(id: string) {
        return this.updateBookingStatus(id, 'CANCELLED');
    }

    async createPublicReservation(data: any) {
        const start = new Date(data.date);
        // Si proporciona time, usarlo; sino usar 19:00 (hora de cena por defecto)
        if (data.time) {
            const [hours, minutes] = data.time.split(':').map(Number);
            start.setUTCHours(hours, minutes, 0, 0);
        } else {
            start.setUTCHours(19, 0, 0, 0);
        }

        const booking = await this.prisma.resBooking.create({
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

        // Auto-assign Table (only for groups of 12 or less)
        const restaurant = await this.prisma.restaurant.findUnique({ where: { id: data.restaurantId }, select: { defaultDuration: true } });
        let tableId: string | null = null;
        if (data.pax <= 12) {
            tableId = await this.findAvailableTable(data.restaurantId, start, data.pax, restaurant?.defaultDuration || 90);
        }
        if (tableId) {
            await this.prisma.resBooking.update({
                where: { id: booking.id },
                data: { tableId }
            });
        }

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

    // --- Access (delegated to RestaurantAccessService) ---

    getAuthorizedUsers(restaurantId: string, user?: any) {
        return this.access.getAuthorizedUsers(restaurantId, user);
    }

    authorizeUser(restaurantId: string, data: { email: string; password?: string; role?: string; permissions?: string[] }, user?: any) {
        return this.access.authorizeUser(restaurantId, data, user);
    }

    deauthorizeUser(restaurantId: string, userId: string, user?: any) {
        return this.access.deauthorizeUser(restaurantId, userId, user);
    }

    getAccessProfiles(restaurantId: string, user?: any) {
        return this.access.getAccessProfiles(restaurantId, user);
    }

    createAccessProfile(restaurantId: string, data: { name: string; baseRole?: string; permissions: string[] }, user?: any) {
        return this.access.createAccessProfile(restaurantId, data, user);
    }

    updateAccessProfile(profileId: string, data: { name?: string; baseRole?: string; permissions?: string[] }, user?: any) {
        return this.access.updateAccessProfile(profileId, data, user);
    }

    deleteAccessProfile(profileId: string, user?: any) {
        return this.access.deleteAccessProfile(profileId, user);
    }

    async autoAssignPendingBookings(restaurantId: string, date: Date) {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const pendingBookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                tableId: null,
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.NO_SHOW] }
            },
            orderBy: { pax: 'desc' } // Assign larger groups first for better optimization
        });

        if (pendingBookings.length === 0) return;

        this.logger.log(`Attempting to auto-assign ${pendingBookings.length} pending bookings for ${date.toDateString()}`);

        const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { defaultDuration: true } });
        const duration = restaurant?.defaultDuration || 90;

        for (const booking of pendingBookings) {
            if (booking.pax > 12) continue; // Manual handling for large groups
            
            const tableId = await this.findAvailableTable(restaurantId, new Date(booking.date), booking.pax, duration);
            if (tableId) {
                await this.prisma.resBooking.update({
                    where: { id: booking.id },
                    data: { tableId }
                });
                this.logger.log(`Auto-assigned booking ${booking.id} to table ${tableId}`);
            }
        }
    }
}
