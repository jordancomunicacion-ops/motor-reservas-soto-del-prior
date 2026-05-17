import {
    generateSlots,
    isTableBooked,
    isSlotAvailable,
    canSatisfyPaxWithCluster,
    findClusterForPax,
    selectTableOrCluster,
    type SlotTable,
    type SlotBooking,
} from './availability-helpers';

const table = (overrides: Partial<SlotTable> & Pick<SlotTable, 'id'>): SlotTable => ({
    id: overrides.id,
    minPax: overrides.minPax ?? 1,
    maxPax: overrides.maxPax ?? 4,
    seatsLostPerJoin: overrides.seatsLostPerJoin ?? 1,
    metadata: overrides.metadata ?? {},
});

const booking = (
    id: string,
    tableId: string | null,
    isoDate: string,
    duration = 90,
    linkedTableIds?: string[],
): SlotBooking => ({
    id,
    tableId,
    date: new Date(isoDate),
    duration,
    ...(linkedTableIds ? { linkedTableIds } : {}),
});

describe('generateSlots', () => {
    it('genera slots cada 30 minutos en un turno de 13:00 a 16:00', () => {
        expect(generateSlots('13:00', '16:00', 30)).toEqual([
            '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        ]);
    });

    it('no incluye el slot exactamente igual a la hora final', () => {
        expect(generateSlots('20:00', '21:00', 60)).toEqual(['20:00']);
    });

    it('devuelve lista vacía si start === end', () => {
        expect(generateSlots('14:00', '14:00', 15)).toEqual([]);
    });

    it('maneja intervalos que cruzan la hora (45 min)', () => {
        expect(generateSlots('13:00', '15:00', 45)).toEqual(['13:00', '13:45', '14:30']);
    });

    it('pad-cero en horas y minutos < 10', () => {
        expect(generateSlots('09:00', '10:00', 30)).toEqual(['09:00', '09:30']);
    });
});

describe('isTableBooked', () => {
    const t1 = table({ id: 't1' });

    it('false si no hay reservas', () => {
        expect(isTableBooked(t1, new Date('2026-05-20T13:00:00Z'), 90, [])).toBe(false);
    });

    it('false si la reserva es de otra mesa', () => {
        const bookings = [booking('b1', 't2', '2026-05-20T13:00:00Z')];
        expect(isTableBooked(t1, new Date('2026-05-20T13:00:00Z'), 90, bookings)).toBe(false);
    });

    it('true si el slot solapa parcialmente con una reserva', () => {
        const bookings = [booking('b1', 't1', '2026-05-20T14:00:00Z')]; // 14:00 a 15:30
        expect(isTableBooked(t1, new Date('2026-05-20T13:30:00Z'), 90, bookings)).toBe(true); // 13:30 a 15:00 solapa
    });

    it('false si el slot acaba justo cuando empieza la reserva', () => {
        const bookings = [booking('b1', 't1', '2026-05-20T14:30:00Z')]; // 14:30 a 16:00
        expect(isTableBooked(t1, new Date('2026-05-20T13:00:00Z'), 90, bookings)).toBe(false); // 13:00 a 14:30 toca pero no solapa
    });

    it('respeta la duración propia de la reserva si difiere de defaultDuration', () => {
        const bookings = [booking('b1', 't1', '2026-05-20T13:00:00Z', 180)]; // 13:00 a 16:00
        expect(isTableBooked(t1, new Date('2026-05-20T15:30:00Z'), 90, bookings)).toBe(true);
    });

    it('ignora bookings con tableId null y sin cluster enlazado', () => {
        const bookings = [booking('b1', null, '2026-05-20T13:00:00Z')];
        expect(isTableBooked(t1, new Date('2026-05-20T13:00:00Z'), 90, bookings)).toBe(false);
    });

    it('true cuando la reserva ocupa la mesa vía linkedTableIds del cluster', () => {
        // reserva cabecera en t2 con t1 enlazada
        const bookings = [booking('b1', 't2', '2026-05-20T13:00:00Z', 90, ['t1'])];
        expect(isTableBooked(t1, new Date('2026-05-20T13:30:00Z'), 90, bookings)).toBe(true);
    });

    describe('con buffer', () => {
        it('buffer=15: 14:30 inicio (reserva acaba 14:30) ya no colisiona... pero buffer extiende 15min', () => {
            // reserva 13:00-14:30; nuevo slot 14:30-16:00. Sin buffer no colisiona.
            const bookings = [booking('b1', 't1', '2026-05-20T13:00:00Z')];
            expect(isTableBooked(t1, new Date('2026-05-20T14:30:00Z'), 90, bookings, 15)).toBe(true);
        });

        it('buffer=15: hueco de 16 minutos basta', () => {
            // reserva 13:00-14:30; nuevo slot 14:46-16:16 → gap de 16 min ≥ buffer
            const bookings = [booking('b1', 't1', '2026-05-20T13:00:00Z')];
            expect(isTableBooked(t1, new Date('2026-05-20T14:46:00Z'), 90, bookings, 15)).toBe(false);
        });

        it('buffer=0 mantiene comportamiento original', () => {
            const bookings = [booking('b1', 't1', '2026-05-20T13:00:00Z')];
            expect(isTableBooked(t1, new Date('2026-05-20T14:30:00Z'), 90, bookings, 0)).toBe(false);
        });
    });
});

describe('findClusterForPax', () => {
    it('devuelve [start] si la mesa única ya cubre el pax', () => {
        const t1 = table({ id: 't1', maxPax: 6 });
        expect(findClusterForPax(t1, [t1], 4)).toEqual(['t1']);
    });

    it('expande BFS y devuelve los IDs del cluster que cubre el pax', () => {
        const t1 = table({ id: 't1', maxPax: 4, metadata: { contiguousTableIds: ['t2'] } });
        const t2 = table({ id: 't2', maxPax: 4, metadata: { contiguousTableIds: ['t1'] } });
        expect(findClusterForPax(t1, [t1, t2], 6)).toEqual(['t1', 't2']);
    });

    it('null si ningún cluster posible cubre el pax', () => {
        const t1 = table({ id: 't1', maxPax: 2 });
        expect(findClusterForPax(t1, [t1], 10)).toBeNull();
    });
});

describe('selectTableOrCluster', () => {
    const slot = new Date('2026-05-20T13:00:00Z');

    it('escoge la mesa única más pequeña que encaja', () => {
        const tables = [
            table({ id: 't1', minPax: 1, maxPax: 8 }),
            table({ id: 't2', minPax: 1, maxPax: 4 }),
        ];
        expect(selectTableOrCluster(slot, 3, tables, [], 90)).toEqual({ tableId: 't2', linkedTableIds: [] });
    });

    it('cae a cluster y devuelve los enlazados aparte del head', () => {
        const tables = [
            table({ id: 't1', minPax: 1, maxPax: 4, metadata: { contiguousTableIds: ['t2'] } }),
            table({ id: 't2', minPax: 1, maxPax: 4, metadata: { contiguousTableIds: ['t1'] } }),
        ];
        const res = selectTableOrCluster(slot, 6, tables, [], 90);
        expect(res).toEqual({ tableId: 't1', linkedTableIds: ['t2'] });
    });

    it('null si ninguna mesa libre encaja ni hay cluster suficiente', () => {
        const tables = [table({ id: 't1', minPax: 1, maxPax: 2 })];
        expect(selectTableOrCluster(slot, 10, tables, [], 90)).toBeNull();
    });

    it('respeta linkedTableIds en bookings al detectar mesas ocupadas', () => {
        const tables = [
            table({ id: 't1', minPax: 1, maxPax: 4, metadata: { contiguousTableIds: ['t2'] } }),
            table({ id: 't2', minPax: 1, maxPax: 4, metadata: { contiguousTableIds: ['t1'] } }),
        ];
        const bookings = [booking('b1', 't1', '2026-05-20T13:00:00Z', 90, ['t2'])];
        // ambas mesas bloqueadas por la reserva existente
        expect(selectTableOrCluster(slot, 2, tables, bookings, 90)).toBeNull();
    });
});

describe('isSlotAvailable', () => {
    const slot = new Date('2026-05-20T13:00:00Z');

    it('true si hay una mesa libre que encaja con pax', () => {
        const tables = [table({ id: 't1', minPax: 1, maxPax: 4 })];
        expect(isSlotAvailable(slot, 2, tables, [], 90)).toBe(true);
    });

    it('false si la única mesa que encaja está ocupada', () => {
        const tables = [table({ id: 't1', minPax: 1, maxPax: 4 })];
        const bookings = [booking('b1', 't1', '2026-05-20T13:00:00Z')];
        expect(isSlotAvailable(slot, 2, tables, bookings, 90)).toBe(false);
    });

    it('false si pax > maxPax y no hay mesas contiguas', () => {
        const tables = [table({ id: 't1', minPax: 1, maxPax: 4 })];
        expect(isSlotAvailable(slot, 6, tables, [], 90)).toBe(false);
    });

    // Decisión de diseño: cuando NO hay ninguna mesa cuyo rango (minPax-maxPax)
    // encaje con `pax`, la búsqueda cae a la rama de cluster, que ignora minPax
    // y solo mira capacidad. Esto es intencional: un restaurante con solo mesas
    // de 4 prefiere acomodar una reserva de 2 en una mesa de 4 antes que
    // perderla. minPax actúa como "preferencia" para el matching directo,
    // no como bloqueo duro.
    it('permite pax < minPax via cluster (flexibilidad operativa)', () => {
        const tables = [table({ id: 't1', minPax: 4, maxPax: 8 })];
        expect(isSlotAvailable(slot, 2, tables, [], 90)).toBe(true);
    });

    it('true con cluster: 2 mesas de 4 contiguas pueden acoger 6 (perdiendo 1 silla por unión)', () => {
        // capacidad teórica = 4 + 4 - 1 = 7 (perdemos 1 silla en cada mesa por la unión)
        // pero la fórmula resta seatsLostPerJoin por vecinos: t1 pierde 1 (vecino t2), t2 pierde 1 (vecino t1) → 4+4-1-1 = 6
        const tables = [
            table({ id: 't1', minPax: 1, maxPax: 4, seatsLostPerJoin: 1, metadata: { contiguousTableIds: ['t2'] } }),
            table({ id: 't2', minPax: 1, maxPax: 4, seatsLostPerJoin: 1, metadata: { contiguousTableIds: ['t1'] } }),
        ];
        expect(isSlotAvailable(slot, 6, tables, [], 90)).toBe(true);
    });

    it('false con cluster cuando una de las mesas del cluster está ocupada', () => {
        const tables = [
            table({ id: 't1', minPax: 1, maxPax: 4, metadata: { contiguousTableIds: ['t2'] } }),
            table({ id: 't2', minPax: 1, maxPax: 4, metadata: { contiguousTableIds: ['t1'] } }),
        ];
        const bookings = [booking('b1', 't2', '2026-05-20T13:00:00Z')];
        expect(isSlotAvailable(slot, 6, tables, bookings, 90)).toBe(false);
    });
});

describe('canSatisfyPaxWithCluster', () => {
    it('false para una sola mesa que ya no entra por sí sola', () => {
        const t1 = table({ id: 't1', maxPax: 4, metadata: {} });
        expect(canSatisfyPaxWithCluster(t1, [t1], 6)).toBe(false);
    });

    it('expande BFS hasta encontrar la capacidad suficiente', () => {
        // 3 mesas en fila: t1—t2—t3, cada una 4, seatsLost 1.
        // cluster {t1}: 4 → no llega a 8.
        // cluster {t1,t2}: 4+4-1-1 = 6 → no llega.
        // cluster {t1,t2,t3}: 4+4+4 - (vecinos en cluster: t1 tiene 1, t2 tiene 2, t3 tiene 1) = 12 - 4 = 8 → OK.
        const t1 = table({ id: 't1', maxPax: 4, metadata: { contiguousTableIds: ['t2'] } });
        const t2 = table({ id: 't2', maxPax: 4, metadata: { contiguousTableIds: ['t1', 't3'] } });
        const t3 = table({ id: 't3', maxPax: 4, metadata: { contiguousTableIds: ['t2'] } });
        expect(canSatisfyPaxWithCluster(t1, [t1, t2, t3], 8)).toBe(true);
    });

    it('no entra en bucle infinito con grafos cíclicos', () => {
        const t1 = table({ id: 't1', maxPax: 2, metadata: { contiguousTableIds: ['t2'] } });
        const t2 = table({ id: 't2', maxPax: 2, metadata: { contiguousTableIds: ['t1', 't3'] } });
        const t3 = table({ id: 't3', maxPax: 2, metadata: { contiguousTableIds: ['t2', 't1'] } });
        expect(canSatisfyPaxWithCluster(t1, [t1, t2, t3], 100)).toBe(false);
    });
});
