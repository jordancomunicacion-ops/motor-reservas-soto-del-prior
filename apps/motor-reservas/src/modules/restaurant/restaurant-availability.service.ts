import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResBookingStatus, ShiftType } from '../../common/enums';
import {
    generateSlots,
    isSlotAvailable,
    isTableBooked,
    selectTableOrCluster,
    type SlotBooking,
    type SlotTable,
} from './availability-helpers';
import { toDateOnlyString, zonedDateToUtc, zonedDayOfWeek, zonedDayRangeUtc } from '../../common/timezone';

export type TxOrPrisma = PrismaService | Prisma.TransactionClient;

const bookingProjection = {
    id: true,
    date: true,
    duration: true,
    tableId: true,
    metadata: true,
} as const;

function toSlotBooking(b: { id: string; date: Date; duration: number; tableId: string | null; metadata: Prisma.JsonValue | null }): SlotBooking {
    const meta = (b.metadata as { linkedTableIds?: unknown } | null) || {};
    const linked = Array.isArray(meta.linkedTableIds) ? (meta.linkedTableIds as string[]) : undefined;
    return {
        id: b.id,
        date: b.date,
        duration: b.duration,
        tableId: b.tableId,
        ...(linked ? { linkedTableIds: linked } : {}),
    };
}

@Injectable()
export class RestaurantAvailabilityService {
    private readonly logger = new Logger(RestaurantAvailabilityService.name);

    constructor(private readonly prisma: PrismaService) {}

    private async getRestaurantConfig(restaurantId: string): Promise<{ timezone: string; defaultDuration: number }> {
        const r = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { timezone: true, defaultDuration: true },
        });
        return {
            timezone: r?.timezone || 'Europe/Madrid',
            defaultDuration: r?.defaultDuration || 90,
        };
    }

    async getAvailableSlots(restaurantId: string, dateStr: string, pax: number, type?: string) {
        this.logger.debug(`Buscando huecos restaurant=${restaurantId} fecha=${dateStr} pax=${pax}`);
        const { timezone, defaultDuration } = await this.getRestaurantConfig(restaurantId);
        const dayStr = toDateOnlyString(dateStr);
        const todayStr = toDateOnlyString(new Date());

        if (dayStr < todayStr) {
            return { slots: [], closed: true, message: 'Fecha pasada' };
        }

        const dayOfWeek = zonedDayOfWeek(dayStr, timezone);

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

        const { start: startOfDay, end: endOfDay } = zonedDayRangeUtc(dayStr, timezone);

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

        const bookingsRaw = await this.prisma.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] },
            },
            select: bookingProjection,
        });
        const bookings = bookingsRaw.map(toSlotBooking);

        const availableSlots: string[] = [];
        const now = new Date();

        for (const shift of activeShifts) {
            const slots = generateSlots(shift.startTime, shift.endTime, shift.slotInterval);

            for (const slot of slots) {
                const slotTime = zonedDateToUtc(dayStr, slot, timezone);

                if (dayStr === todayStr && slotTime < now) continue;

                if (isSlotAvailable(slotTime, pax, tables as SlotTable[], bookings, defaultDuration)) {
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
     * Busca una mesa única libre que pueda acomodar `pax`. Aplica el mismo filtro
     * de zonas bloqueadas por evento que getAvailableSlots (issue #4 de la revisión).
     * Para soporte de clusters, usar findAvailableCluster.
     */
    async findAvailableTable(
        restaurantId: string,
        date: Date,
        pax: number,
        duration: number,
        client: TxOrPrisma = this.prisma,
    ): Promise<string | null> {
        const blockedZoneIds = await this.blockedZoneIdsFor(restaurantId, date, client);

        const tables = await client.table.findMany({
            where: {
                zone: {
                    restaurantId,
                    id: blockedZoneIds.length > 0 ? { notIn: blockedZoneIds } : undefined,
                },
                isActive: true,
                maxPax: { gte: pax },
                minPax: { lte: pax },
            },
            orderBy: { maxPax: 'asc' },
        });

        const bookings = await this.loadDayBookings(restaurantId, date, client);

        for (const t of tables) {
            if (!isTableBooked(t as SlotTable, date, duration, bookings)) return t.id;
        }
        return null;
    }

    /**
     * Variante con soporte de cluster: si no hay mesa única libre, busca un cluster
     * de mesas contiguas que satisfaga el pax. Devuelve `{ tableId, linkedTableIds[] }`.
     * Llamable dentro de una transacción para coherencia.
     */
    async findAvailableCluster(
        restaurantId: string,
        date: Date,
        pax: number,
        duration: number,
        client: TxOrPrisma = this.prisma,
    ): Promise<{ tableId: string; linkedTableIds: string[] } | null> {
        const blockedZoneIds = await this.blockedZoneIdsFor(restaurantId, date, client);

        const tables = await client.table.findMany({
            where: {
                zone: {
                    restaurantId,
                    id: blockedZoneIds.length > 0 ? { notIn: blockedZoneIds } : undefined,
                },
                isActive: true,
            },
        });

        const bookings = await this.loadDayBookings(restaurantId, date, client);
        return selectTableOrCluster(date, pax, tables as SlotTable[], bookings, duration);
    }

    private async blockedZoneIdsFor(restaurantId: string, date: Date, client: TxOrPrisma): Promise<string[]> {
        // Day window conservador (±1 día sobre la instante) para cubrir todas las TZs
        const startOfDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const events = await client.event.findMany({
            where: { restaurantId, date: { gte: startOfDay, lte: endOfDay }, isActive: true },
            include: { zones: { select: { id: true } } },
        });
        return events.flatMap(e => e.zones.map(z => z.id));
    }

    private async loadDayBookings(restaurantId: string, date: Date, client: TxOrPrisma): Promise<SlotBooking[]> {
        const startOfDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const raws = await client.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] },
            },
            select: bookingProjection,
        });
        return raws.map(toSlotBooking);
    }
}
