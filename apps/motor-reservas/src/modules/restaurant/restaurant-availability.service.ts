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

    private async getRestaurantConfig(restaurantId: string): Promise<{ timezone: string; defaultDuration: number; bufferMinutes: number }> {
        const r = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { timezone: true, defaultDuration: true, bufferMinutes: true },
        });
        return {
            timezone: r?.timezone || 'Europe/Madrid',
            defaultDuration: r?.defaultDuration || 90,
            bufferMinutes: r?.bufferMinutes ?? 15,
        };
    }

    async getAvailableSlots(restaurantId: string, dateStr: string, pax: number, type?: string) {
        this.logger.debug(`Buscando huecos restaurant=${restaurantId} fecha=${dateStr} pax=${pax}`);
        const { timezone, defaultDuration, bufferMinutes } = await this.getRestaurantConfig(restaurantId);
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

        const { start: startOfDay, end: endOfDay } = zonedDayRangeUtc(dayStr, timezone);

        // Apertura excepcional: si cubre el día, sustituye el filtro por daysOfWeek
        // y permite operar aunque haya un cierre solapado.
        const opening = await this.prisma.restaurantOpening.findFirst({
            where: {
                restaurantId,
                date: { lte: endOfDay },
                OR: [
                    { endDate: null, date: { gte: startOfDay, lte: endOfDay } },
                    { endDate: { gte: startOfDay } }
                ]
            }
        });

        type SlotShift = { id?: string; name?: string; startTime: string; endTime: string; slotInterval: number; type?: string };
        let activeShifts: SlotShift[];

        if (opening) {
            const allowed = new Set(opening.shiftIds.split(',').map(x => x.trim()).filter(Boolean));
            const reused: SlotShift[] = shifts
                .filter(s => allowed.has(s.id))
                .map(s => ({ id: s.id, name: s.name, type: s.type, startTime: s.startTime, endTime: s.endTime, slotInterval: s.slotInterval }));
            const rawCustom = (opening.customShifts as Array<{
                name?: string;
                type?: string;
                startTime?: string;
                endTime?: string;
                slotInterval?: number;
            }> | null) ?? [];
            const custom: SlotShift[] = rawCustom
                .filter(cs => cs?.startTime && cs?.endTime && cs?.slotInterval)
                .map(cs => ({
                    name: cs.name,
                    startTime: cs.startTime as string,
                    endTime: cs.endTime as string,
                    slotInterval: cs.slotInterval as number,
                    type: cs.type
                }))
                .filter(cs => !type || cs.type === type);
            activeShifts = [...reused, ...custom];
        } else {
            activeShifts = shifts
                .filter(s => {
                    const days = s.daysOfWeek.split(',').map(d => d.trim());
                    return days.includes(dayOfWeek.toString());
                })
                .map(s => ({ id: s.id, name: s.name, type: s.type, startTime: s.startTime, endTime: s.endTime, slotInterval: s.slotInterval }));
        }

        if (activeShifts.length === 0) {
            return { slots: [], closed: true, message: 'No hay turnos para este día' };
        }

        const dayEvents = await this.prisma.event.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                isActive: true,
            },
            include: {
                zones: { select: { id: true, name: true } },
                _count: { select: { bookings: true } },
            },
        });

        // Pre-calcula la franja de cada evento [start, end) y las zonas que ocupa
        const eventRanges = dayEvents.map(e => ({
            start: e.date.getTime(),
            end: e.date.getTime() + (e.duration || 120) * 60000,
            zoneIds: new Set(e.zones.map(z => z.id)),
        }));

        const allTables = await this.prisma.table.findMany({
            where: {
                zone: { restaurantId },
                isActive: true,
            },
            include: { zone: { select: { id: true } } },
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
        const shiftSlots: Array<{ id?: string; name: string; type: string; startTime: string; endTime: string; slots: string[] }> = [];
        const now = new Date();

        for (const shift of activeShifts) {
            const slots = generateSlots(shift.startTime, shift.endTime, shift.slotInterval);
            const slotsForShift: string[] = [];

            for (const slot of slots) {
                const slotTime = zonedDateToUtc(dayStr, slot, timezone);

                if (dayStr === todayStr && slotTime < now) continue;

                // Zonas bloqueadas solo si el slot solapa con la franja del evento
                const slotStartMs = slotTime.getTime();
                const slotEndMs = slotStartMs + defaultDuration * 60000;
                const blockedZoneIds = new Set<string>();
                for (const range of eventRanges) {
                    if (range.start < slotEndMs && range.end > slotStartMs) {
                        for (const zId of range.zoneIds) blockedZoneIds.add(zId);
                    }
                }

                const candidateTables = blockedZoneIds.size > 0
                    ? allTables.filter(t => !blockedZoneIds.has(t.zone.id))
                    : allTables;

                if (isSlotAvailable(slotTime, pax, candidateTables as SlotTable[], bookings, defaultDuration, bufferMinutes)) {
                    if (!slotsForShift.includes(slot)) slotsForShift.push(slot);
                    if (!availableSlots.includes(slot)) {
                        availableSlots.push(slot);
                    }
                }
            }

            if (slotsForShift.length > 0) {
                shiftSlots.push({
                    id: shift.id,
                    name: shift.name || (shift.type === 'BREAKFAST' ? 'Desayuno' : shift.type === 'DINNER' ? 'Cena' : 'Comida'),
                    type: shift.type || 'LUNCH',
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    slots: slotsForShift,
                });
            }
        }

        return {
            slots: availableSlots,
            shiftSlots,
            closed: activeShifts.length === 0,
            events: dayEvents,
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
        bufferMinutes = 0,
    ): Promise<string | null> {
        const blockedZoneIds = await this.blockedZoneIdsForRange(restaurantId, date, duration, client);

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
            if (!isTableBooked(t as SlotTable, date, duration, bookings, bufferMinutes)) return t.id;
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
        bufferMinutes = 0,
        excludeBookingId?: string,
    ): Promise<{ tableId: string; linkedTableIds: string[] } | null> {
        const blockedZoneIds = await this.blockedZoneIdsForRange(restaurantId, date, duration, client);

        const tables = await client.table.findMany({
            where: {
                zone: {
                    restaurantId,
                    id: blockedZoneIds.length > 0 ? { notIn: blockedZoneIds } : undefined,
                },
                isActive: true,
            },
        });

        const bookings = await this.loadDayBookings(restaurantId, date, client, excludeBookingId);
        return selectTableOrCluster(date, pax, tables as SlotTable[], bookings, duration, bufferMinutes);
    }

    /**
     * Zonas bloqueadas por eventos cuya franja [event.date, event.date+duration)
     * solapa con la franja [date, date+durationMinutes) de la reserva candidata.
     */
    private async blockedZoneIdsForRange(
        restaurantId: string,
        date: Date,
        durationMinutes: number,
        client: TxOrPrisma,
    ): Promise<string[]> {
        // Ventana amplia para que el filtro inicial atrape todos los eventos relevantes;
        // el solape exacto se comprueba en memoria.
        const windowStart = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        const windowEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const events = await client.event.findMany({
            where: { restaurantId, date: { gte: windowStart, lte: windowEnd }, isActive: true },
            include: { zones: { select: { id: true } } },
        });
        const reservationStart = date.getTime();
        const reservationEnd = reservationStart + durationMinutes * 60000;
        const blocked = new Set<string>();
        for (const e of events) {
            const eStart = e.date.getTime();
            const eEnd = eStart + (e.duration || 120) * 60000;
            if (eStart < reservationEnd && eEnd > reservationStart) {
                for (const z of e.zones) blocked.add(z.id);
            }
        }
        return Array.from(blocked);
    }

    private async loadDayBookings(restaurantId: string, date: Date, client: TxOrPrisma, excludeBookingId?: string): Promise<SlotBooking[]> {
        const startOfDay = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        const raws = await client.resBooking.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: { notIn: [ResBookingStatus.CANCELLED, ResBookingStatus.RELEASED, ResBookingStatus.NO_SHOW] },
                ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
            },
            select: bookingProjection,
        });
        return raws.map(toSlotBooking);
    }
}
