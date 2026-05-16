import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResBookingStatus, ShiftType } from '../../common/enums';
import { generateSlots, isSlotAvailable, isTableBooked } from './availability-helpers';

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
            const slots = generateSlots(shift.startTime, shift.endTime, shift.slotInterval);

            for (const slot of slots) {
                const [h, m] = slot.split(':').map(Number);
                const slotTime = new Date(date);
                slotTime.setUTCHours(h, m, 0, 0);

                if (isToday && slotTime < now) continue;

                if (isSlotAvailable(slotTime, pax, tables, bookings, defaultDuration)) {
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

        for (const table of tables) {
            if (!isTableBooked(table, date, duration, bookings)) return table.id;
        }
        return null;
    }
}
