import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { WaitlistService } from './waitlist.service';

@Injectable()
export class RestaurantService {
    private readonly logger = new Logger(RestaurantService.name);

    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
        private waitlistService: WaitlistService,
    ) { }

    // ... (existing code) ...

    @Cron(CronExpression.EVERY_HOUR)
    async process48hReminders() {
        this.logger.log('Running 48h reminder check for restaurant reservations...');
        const targetDateStart = new Date();
        targetDateStart.setHours(targetDateStart.getHours() + 48, 0, 0, 0);
        const targetDateEnd = new Date(targetDateStart);
        targetDateEnd.setHours(targetDateEnd.getHours() + 1, 0, 0, 0);

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                status: 'CONFIRMED', // We only want to review confirmed bookings that haven't been reconfirmed
                date: {
                    gte: targetDateStart,
                    lt: targetDateEnd
                }
            }
        });

        if (bookings.length === 0) return;

        this.logger.log(`Found ${bookings.length} reservations to remind.`);

        for (const booking of bookings) {
            try {
                // Change status to TO_REVIEW
                await this.prisma.resBooking.update({
                    where: { id: booking.id },
                    data: { status: 'TO_REVIEW' }
                });

                // Send reminder email
                if (booking.guestEmail) {
                    await this.mailService.sendRestaurantNotification(booking, 'reminder');
                }
            } catch (error) {
                this.logger.error(`Error processing reminder for booking ${booking.id}:`, error);
            }
        }
    }

    // --- Public Reservation Flow ---

    async createPublicReservation(data: {
        restaurantId: string;
        date: string;
        time: string;
        pax: number;
        name: string;
        email: string;
        phone: string;
        notes?: string;
        // CRM Additional Fields
        surname2?: string;
        age?: number;
        gender?: string;
        whatsapp?: string;
        instagram?: string;
        facebook?: string;
        tiktok?: string;
        linkedin?: string;
        xTwitter?: string;
        paymentMethodId?: string;
    }) {
        // 1. Combine Date + Time
        const [hours, minutes] = data.time.split(':').map(Number);
        const start = new Date(data.date); // Assuming YYYY-MM-DD
        start.setHours(hours, minutes, 0, 0);

        // 2. Initial Status PENDING
        const booking = await this.prisma.resBooking.create({
            data: {
                restaurantId: data.restaurantId,
                date: start,
                pax: data.pax,
                guestName: data.name,
                guestSurname2: data.surname2,
                guestEmail: data.email,
                guestPhone: data.phone,
                guestAge: data.age ? Number(data.age) : null,
                guestGender: data.gender,
                guestWhatsapp: data.whatsapp,
                instagram: data.instagram,
                facebook: data.facebook,
                tiktok: data.tiktok,
                linkedin: data.linkedin,
                xTwitter: data.xTwitter,
                notes: data.notes,
                status: 'PENDING_CONFIRMATION',
                origin: 'WIDGET',
                stripePaymentMethodId: data.paymentMethodId
            }
        });

        // 3. Send Email
        await this.mailService.sendRestaurantNotification(booking, 'created');

        // 4. Sync with CRM removed
        
        return booking;
    }

    async confirmReservation(bookingId: string) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new Error('Reserva no encontrada');

        if (booking.status === 'CONFIRMED') return booking;

        const updated = await this.prisma.resBooking.update({
            where: { id: bookingId },
            data: { status: 'CONFIRMED' }
        });

        await this.mailService.sendRestaurantNotification(updated, 'confirmed');

        // Sync with CRM removed
        
        return updated;
    }

    async cancelReservation(bookingId: string) {
        const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
        if (!booking) throw new Error('Reserva no encontrada');

        const updated = await this.prisma.resBooking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
        });

        await this.mailService.sendRestaurantNotification(updated, 'cancelled');

        // Sync with CRM removed
        
        return updated;
    }

    async createRestaurant(data: { name: string; currency: string }) {
        return this.prisma.restaurant.create({ data });
    }

    async getRestaurants() {
        return this.prisma.restaurant.findMany({ include: { zones: true } });
    }

    async getRestaurant(id: string) {
        return this.prisma.restaurant.findUnique({ 
            where: { id },
            include: { hotel: true, widgetConfig: true }
        });
    }


    async updateRestaurant(id: string, data: any) {
        const { hotelId, ...rest } = data;
        
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


    async deleteRestaurant(id: string) {
        return this.prisma.$transaction(async (tx) => {
            await tx.restaurantWaitlist.deleteMany({ where: { restaurantId: id } });
            await tx.resBooking.deleteMany({ where: { restaurantId: id } });
            
            const zones = await tx.zone.findMany({ where: { restaurantId: id }, select: { id: true } });
            const zoneIds = zones.map(z => z.id);
            if (zoneIds.length > 0) {
                await tx.tableHold.deleteMany({ where: { table: { zoneId: { in: zoneIds } } } });
                await tx.table.deleteMany({ where: { zoneId: { in: zoneIds } } });
                await tx.zone.deleteMany({ where: { restaurantId: id } });
            }

            return tx.restaurant.delete({ where: { id } });
        });
    }

    // --- Visual Plan & Zones ---
    async syncZones(restaurantId: string, zones: any[]) {
        for (const z of zones) {
            if (z.id && z.id.length > 10) {
                await this.prisma.zone.update({ where: { id: z.id }, data: { name: z.name, index: z.index, isActive: z.isActive } });
            } else {
                await this.prisma.zone.create({ data: { restaurantId, name: z.name, index: z.index } });
            }
        }
        return this.getTables(restaurantId);
    }

    async createZone(restaurantId: string, name: string) {
        return this.prisma.zone.create({
            data: { restaurantId, name }
        });
    }

    // --- Tables ---
    async syncTables(zoneId: string, tables: any[]) {
        const results: any[] = [];
        const idMap: Record<string, string> = {};

        // 1. Create/Update tables and build ID map
        for (const t of tables) {
            const tableData: any = {
                x: t.x, y: t.y, width: t.width, height: t.height,
                rotation: t.rotation, shape: t.shape,
                name: t.name, capacity: t.capacity,
                minPax: t.minPax, maxPax: t.maxPax,
                seatsLostPerJoin: t.seatsLostPerJoin || 1,
                metadata: t.metadata || {}
            };
            
            // Temporary store contiguousTableIds if present as a top-level prop or in metadata
            const cids = t.contiguousTableIds || t.metadata?.contiguousTableIds || [];
            
            let synced;
            if (t.id && !t.id.startsWith('temp-')) {
                synced = await this.prisma.table.update({
                    where: { id: t.id },
                    data: tableData
                });
                idMap[t.id] = synced.id;
            } else {
                synced = await this.prisma.table.create({
                    data: { zoneId, ...tableData }
                });
                if (t.id) idMap[t.id] = synced.id;
            }
            results.push({ ...synced, _originalCids: cids });
        }

        // 2. Second pass: Fix contiguousTableIds in metadata using the idMap
        for (const res of results) {
            const originalCids = res._originalCids || [];
            const mappedCids = originalCids.map((cid: string) => idMap[cid] || cid);
            
            await this.prisma.table.update({
                where: { id: res.id },
                data: {
                    metadata: {
                        ...(res.metadata as any || {}),
                        contiguousTableIds: mappedCids
                    }
                }
            });
        }

        // Return the final updated tables
        return this.prisma.table.findMany({ where: { zoneId, isActive: true } });
    }

    async createTable(zoneId: string, name: string, capacity: number) {
        return this.prisma.table.create({
            data: { zoneId, name, capacity }
        });
    }

    async getVisitCount(email?: string | null, phone?: string | null): Promise<number> {
        if (!email && !phone) return 0;
        
        return this.prisma.resBooking.count({
            where: {
                OR: [
                    email ? { guestEmail: email } : null,
                    phone ? { guestPhone: phone } : null
                ].filter(Boolean) as any,
                status: 'SEATED' // Only count actual past visits
            }
        });
    }

    async getTables(restaurantId: string) {
        const start = new Date(new Date().setHours(0, 0, 0, 0));
        const end = new Date(new Date().setHours(23, 59, 59, 999));

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
                status: { not: 'CANCELLED' }
            },
            orderBy: { date: 'asc' }
        });

        // Cache for visit counts to avoid redundant queries for the same guest
        const visitCountCache: Record<string, number> = {};

        // Process bookings: calculate visit counts and distribute to tables
        for (const booking of bookings) {
            const cacheKey = booking.guestEmail || booking.guestPhone || booking.id;
            if (visitCountCache[cacheKey] === undefined) {
                visitCountCache[cacheKey] = await this.getVisitCount(booking.guestEmail, booking.guestPhone);
            }
            (booking as any).visitCount = visitCountCache[cacheKey];
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
    async createBooking(data: any) {
        // Basic impl, can be expanded for validation
        const booking = await this.prisma.resBooking.create({ data });
        
        // Sync with CRM (commented out for now as service is not injected)
        // this.crmIntegrationService.syncRestaurantBooking(booking.id);
        
        return booking;
    }

    async updateBookingStatus(bookingId: string, status: string, tableId?: string) {
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

        return booking;
    }


    async getBookings(restaurantId: string, dateStr?: string, startDateStr?: string, endDateStr?: string) {
        let start: Date;
        let end: Date;

        if (startDateStr && endDateStr) {
            start = new Date(startDateStr);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDateStr);
            end.setHours(23, 59, 59, 999);
        } else if (dateStr) {
            start = new Date(dateStr);
            start.setHours(0, 0, 0, 0);
            end = new Date(dateStr);
            end.setHours(23, 59, 59, 999);
        } else {
            // Default to today
            start = new Date();
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        }

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: start, lte: end }
            },
            include: { table: { include: { zone: true } } },
            orderBy: { date: 'asc' }
        });

        // Add visit count
        for (const booking of bookings) {
            (booking as any).visitCount = await this.getVisitCount(booking.guestEmail, booking.guestPhone);
        }

        return bookings;
    }

    // --- Waitlist ---
    async addToWaitlist(restaurantId: string, data: any) {
        return this.prisma.restaurantWaitlist.create({
            data: {
                restaurantId,
                ...data
            }
        });
    }

    async getWaitlist(restaurantId: string) {
        return this.prisma.restaurantWaitlist.findMany({
            where: { restaurantId, status: { in: ['WAITING', 'NOTIFIED'] } },
            orderBy: { createdAt: 'asc' }
        });
    }

    // --- Shifts & Slots (Synergy) ---
    async getShifts(restaurantId: string) {
        return this.prisma.shift.findMany({
            where: { restaurantId, isActive: true }
        });
    }

    async createShift(restaurantId: string, data: any) {
        return this.prisma.shift.create({
            data: { ...data, restaurantId }
        });
    }

    async getAvailableSlots(restaurantId: string, dateStr: string, pax: number, type?: string) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay(); // 0-6
        
        const shifts = await this.prisma.shift.findMany({
            where: {
                restaurantId,
                isActive: true,
                daysOfWeek: { contains: dayOfWeek.toString() },
                ...(type ? { type } : {})
            }
        });

        const tables = await this.prisma.table.findMany({
            where: { zone: { restaurantId }, isActive: true }
        });

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { notIn: ['CANCELLED', 'NO_SHOW'] }
            },
            select: { id: true, date: true, duration: true, tableId: true }
        });

        const availableSlots: string[] = [];
        
        const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { defaultDuration: true } });
        const defaultDuration = restaurant?.defaultDuration || 90;

        for (const shift of shifts) {
            const slots = this.generateSlots(shift.startTime, shift.endTime, shift.slotInterval);
            
            for (const slot of slots) {
                const [h, m] = slot.split(':').map(Number);
                const slotTime = new Date(date);
                slotTime.setHours(h, m, 0, 0);

                if (this.isSlotAvailable(slotTime, pax, tables, bookings, defaultDuration)) {
                    availableSlots.push(slot);
                }
            }
        }

        return availableSlots;
    }

    private isSlotAvailable(slotTime: Date, pax: number, tables: any[], bookings: any[], defaultDuration: number = 90): boolean {
        // Find free tables at this slotTime
        const freeTables = tables.filter(table => {
            // Check if table is booked at this time
            const isBooked = bookings.some(b => {
                if (!b.tableId || b.tableId !== table.id) return false;
                const bStart = new Date(b.date);
                const bEnd = new Date(bStart.getTime() + (b.duration || defaultDuration) * 60000);
                
                const slotEnd = new Date(slotTime.getTime() + defaultDuration * 60000);
                return (slotTime < bEnd && slotEnd > bStart);
            });
            return !isBooked;
        });

        // 1. Try to find a single table that fits pax
        const singleTable = freeTables.find(t => t.maxPax >= pax && t.minPax <= pax);
        if (singleTable) return true;

        // 2. Try to find a connected cluster of tables that sums up to pax
        for (const startTable of freeTables) {
            if (this.canSatisfyPaxWithCluster(startTable, freeTables, pax)) {
                return true;
            }
        }

        return false;
    }

    private canSatisfyPaxWithCluster(startTable: any, freeTables: any[], targetPax: number): boolean {
        const visited = new Set<string>();
        // We use a queue for BFS, but we need to calculate the total capacity of the growing cluster
        const cluster: any[] = [startTable];
        visited.add(startTable.id);

        let currentTotalCapacity = startTable.maxPax;
        let head = 0;

        while (head < cluster.length) {
            const table = cluster[head++];
            
            // Re-calculate the total capacity of the CURRENT cluster in each step
            // to account for new links formed
            let tempCapacity = 0;
            for (const t of cluster) {
                const metadata = (t.metadata as any) || {};
                const neighborsInCluster = (metadata.contiguousTableIds || [])
                    .filter((id: string) => cluster.some(ct => ct.id === id)).length;
                
                tempCapacity += Math.max(0, t.maxPax - (neighborsInCluster * (t.seatsLostPerJoin || 1)));
            }
            
            if (tempCapacity >= targetPax) return true;

            const metadata = (table.metadata as any) || {};
            const neighborIds = metadata.contiguousTableIds || [];

            for (const nId of neighborIds) {
                if (visited.has(nId)) continue;
                const neighbor = freeTables.find(t => t.id === nId);
                if (neighbor) {
                    visited.add(nId);
                    cluster.push(neighbor);
                    // Optimization: if adding this neighbor might solve it, we'll check in next iteration
                }
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
    }) {
        const [hours, minutes] = data.time.split(':').map(Number);
        const start = new Date(data.date);
        start.setHours(hours, minutes, 0, 0);

        return this.prisma.resBooking.create({
            data: {
                restaurantId: data.restaurantId,
                hotelBookingId: data.bookingId,
                date: start,
                pax: data.pax,
                guestName: data.name,
                guestEmail: data.email,
                isMealPlan: true,
                status: 'CONFIRMED',
                origin: 'HOTEL_SYNERGY'
            }
        });
    }

    async deleteShift(id: string) {
        return this.prisma.shift.delete({
            where: { id }
        });
    }

    async getClosures(restaurantId: string) {
        return this.prisma.restaurantClosure.findMany({
            where: { restaurantId },
            orderBy: { date: 'asc' }
        });
    }

    async createClosure(restaurantId: string, data: { date: string, reason?: string }) {
        return this.prisma.restaurantClosure.create({
            data: {
                restaurantId,
                date: new Date(data.date),
                reason: data.reason
            }
        });
    }

    async deleteClosure(id: string) {
        return this.prisma.restaurantClosure.delete({
            where: { id }
        });
    }
}

