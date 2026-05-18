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
    /**
     * IDs de mesas adicionales (cluster) bloqueadas por esta reserva además de tableId.
     * Las reservas grandes que ocupan varias mesas contiguas guardan aquí el resto del cluster.
     */
    linkedTableIds?: string[];
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
        const matchesTable = b.tableId === table.id ||
            (Array.isArray(b.linkedTableIds) && b.linkedTableIds.includes(table.id));
        if (!matchesTable) return false;
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

/**
 * Devuelve el cluster (lista de IDs) mínimo que puede acoger `targetPax` arrancando
 * desde `startTable`, o null si no hay forma. Misma lógica de BFS que
 * canSatisfyPaxWithCluster, pero devuelve los miembros para que el caller pueda
 * persistirlos en metadata.linkedTableIds.
 */
export function findClusterForPax(
    startTable: SlotTable,
    freeTables: SlotTable[],
    targetPax: number,
): string[] | null {
    const visited = new Set<string>([startTable.id]);
    const cluster: SlotTable[] = [startTable];
    let head = 0;

    const capacity = (members: SlotTable[]) => {
        let cap = 0;
        for (const t of members) {
            const meta = (t.metadata as { contiguousTableIds?: string[] }) || {};
            const neighborsInCluster = (meta.contiguousTableIds || [])
                .filter(id => members.some(m => m.id === id)).length;
            cap += Math.max(0, t.maxPax - neighborsInCluster * (t.seatsLostPerJoin || 1));
        }
        return cap;
    };

    if (capacity(cluster) >= targetPax) return cluster.map(t => t.id);

    while (head < cluster.length) {
        const table = cluster[head++];
        const meta = (table.metadata as { contiguousTableIds?: string[] }) || {};
        for (const nId of meta.contiguousTableIds || []) {
            if (visited.has(nId)) continue;
            const neighbor = freeTables.find(t => t.id === nId);
            if (!neighbor) continue;
            visited.add(nId);
            cluster.push(neighbor);
            if (capacity(cluster) >= targetPax) return cluster.map(t => t.id);
        }
    }
    return null;
}

/**
 * Selecciona la mejor mesa o cluster para `pax` en `slotTime`.
 * Preferencia: mesa única más pequeña que encaje; si no, el cluster mínimo.
 * Devuelve { tableId, linkedTableIds[] } o null.
 */
export function selectTableOrCluster(
    slotTime: Date,
    pax: number,
    tables: SlotTable[],
    bookings: SlotBooking[],
    defaultDuration = 90,
): { tableId: string; linkedTableIds: string[] } | null {
    const freeTables = tables.filter(t => !isTableBooked(t, slotTime, defaultDuration, bookings));

    const single = freeTables
        .filter(t => t.maxPax >= pax && t.minPax <= pax)
        .sort((a, b) => a.maxPax - b.maxPax)[0];
    if (single) return { tableId: single.id, linkedTableIds: [] };

    let best: string[] | null = null;
    for (const start of freeTables) {
        const ids = findClusterForPax(start, freeTables, pax);
        if (ids && (!best || ids.length < best.length)) best = ids;
    }
    if (!best || best.length === 0) return null;
    const [head, ...rest] = best;
    return { tableId: head, linkedTableIds: rest };
}
