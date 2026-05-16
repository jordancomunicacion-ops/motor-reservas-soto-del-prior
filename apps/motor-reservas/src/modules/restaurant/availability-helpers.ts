/**
 * Funciones puras para el cálculo de huecos de mesa. Sin Prisma ni I/O para
 * que sean testeables sin mocks.
 */

export interface SlotTable {
    id: string;
    minPax: number;
    maxPax: number;
    seatsLostPerJoin: number;
    metadata: unknown;
}

export interface SlotBooking {
    id: string;
    date: Date;
    duration: number;
    tableId: string | null;
}

/**
 * Genera la lista de slots "HH:MM" dentro de un turno, separados por `interval` minutos.
 * El último slot generado es estrictamente menor que `end`.
 */
export function generateSlots(startStr: string, endStr: string, interval: number): string[] {
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

/**
 * Indica si una mesa está ocupada por alguna reserva durante el rango
 * [slotTime, slotTime + duration).
 */
export function isTableBooked(
    table: SlotTable,
    slotTime: Date,
    defaultDuration: number,
    bookings: SlotBooking[],
): boolean {
    const slotEnd = new Date(slotTime.getTime() + defaultDuration * 60000);
    return bookings.some(b => {
        if (!b.tableId || b.tableId !== table.id) return false;
        const bStart = new Date(b.date);
        const bEnd = new Date(bStart.getTime() + (b.duration || defaultDuration) * 60000);
        return slotTime < bEnd && slotEnd > bStart;
    });
}

/**
 * BFS sobre las mesas contiguas (declaradas en metadata.contiguousTableIds)
 * para ver si un cluster que arranca en `startTable` puede acomodar `targetPax`.
 * Resta `seatsLostPerJoin` por cada unión efectiva dentro del cluster.
 */
export function canSatisfyPaxWithCluster(
    startTable: SlotTable,
    freeTables: SlotTable[],
    targetPax: number,
): boolean {
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

/**
 * Comprueba si hay una mesa o cluster disponible para `pax` en `slotTime`.
 */
export function isSlotAvailable(
    slotTime: Date,
    pax: number,
    tables: SlotTable[],
    bookings: SlotBooking[],
    defaultDuration = 90,
): boolean {
    const freeTables = tables.filter(table => !isTableBooked(table, slotTime, defaultDuration, bookings));

    const singleTable = freeTables.find(t => t.maxPax >= pax && t.minPax <= pax);
    if (singleTable) return true;

    for (const startTable of freeTables) {
        if (canSatisfyPaxWithCluster(startTable, freeTables, pax)) return true;
    }
    return false;
}
