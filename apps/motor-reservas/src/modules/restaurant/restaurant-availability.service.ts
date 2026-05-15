import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResBookingStatus, ShiftType } from '../../common/enums';

interface SlotTable {
    id: string;
    minPax: number;
    maxPax: number;
    seatsLostPerJoin: number;
    metadata: unknown;
}

interface SlotBooking {
    id: string;
    date: Date;
    duration: number;
    tableId: string | null;
}

@Injectable()
export class RestaurantAvailabilityService {
    private readonly logger = new Logger(RestaurantAvailabilityService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getAvailableSlots(restaurantId: string, dateStr: string, pax: number, type?: string) {
        this.logger.debug(`Buscando huecos restaurant=${restaurantId} fecha=${dateStr} pax=${pax}`);
        const date = new Date(dateStr);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (date < today) {
            return { slots: [], closed: true, message: 'Fecha pasada' };
        }

        const dayOfWeek = date.getDay();

        const shifts = await this.prisma.shift.findMany({
            where: {
                restaurantId,
                isActive: true,
                ...(type ? { type: type as ShiftType } : {}),
            },
        });

        const activeShifts = shifts.filter(s => {
            const days = s.daysOfWeek.split(',').map(d => d.trim());
            return days.includes(dayOfWeek.toString());
        });

        if (activeShifts.length === 0) {
            return { slots: [], closed: true, message: 'No hay turnos para este día' };
        }

        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const dayEvents = await this.prisma.event.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                isActive: true,
            },
            include: {
                zones: true,
                _count: { select: { bookings: true } },
            },
        });

        const blockedZoneIds = dayEvents.flatMap(e => e.zones.map(z => z.id));

        const tables = await this.prisma.table.findMany({
            where: {
                zone: {
                    restaurantId,
                    id: blockedZoneIds.length > 0 ? { notIn: blockedZoneIds } : undefined,
                },
                isActive: true,
            },
        });

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] },
            },
            select: { id: true, date: true, duration: true, tableId: true },
        });

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { defaultDuration: true },
        });
        const defaultDuration = restaurant?.defaultDuration || 90;

        const availableSlots: string[] = [];
        const now = new Date();
        const isToday = date.toISOString().split('T')[0] === now.toISOString().split('T')[0];

        for (const shift of activeShifts) {
            const slots = this.generateSlots(shift.startTime, shift.endTime, shift.slotInterval);

            for (const slot of slots) {
                const [h, m] = slot.split(':').map(Number);
                const slotTime = new Date(date);
                slotTime.setUTCHours(h, m, 0, 0);

                if (isToday && slotTime < now) continue;

                if (this.isSlotAvailable(slotTime, pax, tables, bookings, defaultDuration)) {
                    if (!availableSlots.includes(slot)) {
                        availableSlots.push(slot);
                    }
                }
            }
        }

        return {
            slots: availableSlots,
            closed: activeShifts.length === 0,
            event: dayEvents[0] || null,
        };
    }

    /**
     * Busca una mesa libre que pueda acomodar `pax` en el rango horario indicado.
     * Devuelve el primer match — la lógica de cluster queda fuera (usar getAvailableSlots).
     */
    async findAvailableTable(
        restaurantId: string,
        date: Date,
        pax: number,
        duration: number,
    ): Promise<string | null> {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const tables = await this.prisma.table.findMany({
            where: { zone: { restaurantId }, isActive: true, maxPax: { gte: pax }, minPax: { lte: pax } },
            orderBy: { maxPax: 'asc' },
        });

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] },
            },
            select: { id: true, date: true, duration: true, tableId: true },
        });

        const slotEnd = new Date(date.getTime() + duration * 60000);

        for (const table of tables) {
            const isBooked = bookings.some(b => {
                if (!b.tableId || b.tableId !== table.id) return false;
                const bStart = new Date(b.date);
                const bEnd = new Date(bStart.getTime() + (b.duration || duration) * 60000);
                return date < bEnd && slotEnd > bStart;
            });
            if (!isBooked) return table.id;
        }
        return null;
    }

    private isSlotAvailable(
        slotTime: Date,
        pax: number,
        tables: SlotTable[],
        bookings: SlotBooking[],
        defaultDuration = 90,
    ): boolean {
        const slotEnd = new Date(slotTime.getTime() + defaultDuration * 60000);
        const freeTables = tables.filter(table => {
            const isBooked = bookings.some(b => {
                if (!b.tableId || b.tableId !== table.id) return false;
                const bStart = new Date(b.date);
                const bEnd = new Date(bStart.getTime() + (b.duration || defaultDuration) * 60000);
                return slotTime < bEnd && slotEnd > bStart;
            });
            return !isBooked;
        });

        const singleTable = freeTables.find(t => t.maxPax >= pax && t.minPax <= pax);
        if (singleTable) return true;

        for (const startTable of freeTables) {
            if (this.canSatisfyPaxWithCluster(startTable, freeTables, pax)) return true;
        }
        return false;
    }

    private canSatisfyPaxWithCluster(startTable: SlotTable, freeTables: SlotTable[], targetPax: number): boolean {
        const visited = new Set<string>();
        const cluster: SlotTable[] = [startTable];
        visited.add(startTable.id);
        let head = 0;

        while (head < cluster.length) {
            const table = cluster[head++];

            let tempCapacity = 0;
            for (const t of cluster) {
                const metadata = (t.metadata as { contiguousTableIds?: string[] }) || {};
                const neighborsInCluster = (metadata.contiguousTableIds || [])
                    .filter(id => cluster.some(ct => ct.id === id)).length;
                tempCapacity += Math.max(0, t.maxPax - neighborsInCluster * (t.seatsLostPerJoin || 1));
            }
            if (tempCapacity >= targetPax) return true;

            const metadata = (table.metadata as { contiguousTableIds?: string[] }) || {};
            for (const nId of metadata.contiguousTableIds || []) {
                if (visited.has(nId)) continue;
                const neighbor = freeTables.find(t => t.id === nId);
                if (neighbor) {
                    visited.add(nId);
                    cluster.push(neighbor);
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
}
