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
    bufferMinutes = 0,
): boolean {
    const bufMs = bufferMinutes * 60000;
    const slotEnd = new Date(slotTime.getTime() + defaultDuration * 60000);
    return bookings.some(b => {
        const matchesTable = b.tableId === table.id ||
            (Array.isArray(b.linkedTableIds) && b.linkedTableIds.includes(table.id));
        if (!matchesTable) return false;
        const bStart = new Date(b.date);
        const bEnd = new Date(bStart.getTime() + (b.duration || defaultDuration) * 60000);
        // overlap con buffer: b.start < new.end + buffer && b.end + buffer > new.start
        return bStart.getTime() < slotEnd.getTime() + bufMs && bEnd.getTime() + bufMs > slotTime.getTime();
    });
}

/**
 * BFS sobre las mesas contiguas (declaradas en metadata.contiguousTableIds)
 * para ver si un cluster que arranca en `startTable` puede acomodar `targetPax`.
 * Resta `seatsLostPerJoin` por cada unión efectiva dentro del cluster.
 *
 * Mantiene capacidad y contadores de vecinos-en-cluster de forma incremental
 * (delta al añadir un vecino) en vez de recalcular el cluster entero por iteración.
 */
export function canSatisfyPaxWithCluster(
    startTable: SlotTable,
    freeTables: SlotTable[],
    targetPax: number,
): boolean {
    return findClusterForPax(startTable, freeTables, targetPax) !== null;
}

function contiguousIdsOf(t: SlotTable): string[] {
    const meta = (t.metadata as { contiguousTableIds?: string[] }) || {};
    return Array.isArray(meta.contiguousTableIds) ? meta.contiguousTableIds : [];
}

function effectiveCapacity(t: SlotTable, neighborsInCluster: number): number {
    return Math.max(0, t.maxPax - neighborsInCluster * (t.seatsLostPerJoin || 1));
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
    bufferMinutes = 0,
): boolean {
    const freeTables = tables.filter(table => !isTableBooked(table, slotTime, defaultDuration, bookings, bufferMinutes));

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
    const tableById = new Map(freeTables.map(t => [t.id, t]));
    const cluster: SlotTable[] = [startTable];
    const visited = new Set<string>([startTable.id]);
    const neighborCount = new Map<string, number>([[startTable.id, 0]]);
    let totalCapacity = effectiveCapacity(startTable, 0);

    if (totalCapacity >= targetPax) return [startTable.id];

    let head = 0;
    while (head < cluster.length) {
        const table = cluster[head++];
        for (const nId of contiguousIdsOf(table)) {
            if (visited.has(nId)) continue;
            const neighbor = tableById.get(nId);
            if (!neighbor) continue;

            // Cuenta cuántos miembros del cluster enlazan con este vecino y, en el camino,
            // actualiza incrementalmente la capacidad de los enlazados (un vecino-en-cluster más).
            let newNeighborInClusterCount = 0;
            for (const linkId of contiguousIdsOf(neighbor)) {
                if (!visited.has(linkId)) continue;
                const linked = tableById.get(linkId);
                if (!linked) continue;
                const prev = neighborCount.get(linkId) ?? 0;
                totalCapacity -= effectiveCapacity(linked, prev);
                neighborCount.set(linkId, prev + 1);
                totalCapacity += effectiveCapacity(linked, prev + 1);
                newNeighborInClusterCount++;
            }

            visited.add(nId);
            cluster.push(neighbor);
            neighborCount.set(nId, newNeighborInClusterCount);
            totalCapacity += effectiveCapacity(neighbor, newNeighborInClusterCount);

            if (totalCapacity >= targetPax) return cluster.map(t => t.id);
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
    bufferMinutes = 0,
): { tableId: string; linkedTableIds: string[] } | null {
    const freeTables = tables.filter(t => !isTableBooked(t, slotTime, defaultDuration, bookings, bufferMinutes));

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
