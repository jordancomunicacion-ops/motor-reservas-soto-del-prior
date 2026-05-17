import { zonedDateToUtc, zonedDayRangeUtc, toDateOnlyString, zonedDayOfWeek } from './timezone';

describe('zonedDateToUtc', () => {
    it('Madrid invierno (CET, UTC+1): 13:00 local → 12:00 UTC', () => {
        const d = zonedDateToUtc('2026-01-15', '13:00', 'Europe/Madrid');
        expect(d.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    });

    it('Madrid verano (CEST, UTC+2): 13:00 local → 11:00 UTC', () => {
        const d = zonedDateToUtc('2026-07-15', '13:00', 'Europe/Madrid');
        expect(d.toISOString()).toBe('2026-07-15T11:00:00.000Z');
    });

    it('UTC: 13:00 local = 13:00 UTC', () => {
        const d = zonedDateToUtc('2026-01-15', '13:00', 'UTC');
        expect(d.toISOString()).toBe('2026-01-15T13:00:00.000Z');
    });

    it('NY invierno (EST, UTC-5): 13:00 local → 18:00 UTC', () => {
        const d = zonedDateToUtc('2026-01-15', '13:00', 'America/New_York');
        expect(d.toISOString()).toBe('2026-01-15T18:00:00.000Z');
    });

    it('lanza si la hora es inválida', () => {
        expect(() => zonedDateToUtc('2026-01-15', 'abc', 'Europe/Madrid')).toThrow();
    });
});

describe('zonedDayRangeUtc', () => {
    it('Madrid invierno: día completo abarca 23:00 prev → 23:00 next - 1ms', () => {
        const { start, end } = zonedDayRangeUtc('2026-01-15', 'Europe/Madrid');
        expect(start.toISOString()).toBe('2026-01-14T23:00:00.000Z');
        expect(end.toISOString()).toBe('2026-01-15T22:59:59.999Z');
    });

    it('Madrid verano: día completo abarca 22:00 prev → 22:00 next - 1ms', () => {
        const { start, end } = zonedDayRangeUtc('2026-07-15', 'Europe/Madrid');
        expect(start.toISOString()).toBe('2026-07-14T22:00:00.000Z');
        expect(end.toISOString()).toBe('2026-07-15T21:59:59.999Z');
    });
});

describe('toDateOnlyString', () => {
    it('YYYY-MM-DD entra y sale igual', () => {
        expect(toDateOnlyString('2026-05-18')).toBe('2026-05-18');
    });
    it('ISO completo se recorta', () => {
        expect(toDateOnlyString('2026-05-18T15:30:00Z')).toBe('2026-05-18');
    });
    it('Date usa componentes UTC', () => {
        expect(toDateOnlyString(new Date(Date.UTC(2026, 4, 18, 23, 59)))).toBe('2026-05-18');
    });
});

describe('zonedDayOfWeek', () => {
    it('2026-05-18 (lunes) en Madrid', () => {
        expect(zonedDayOfWeek('2026-05-18', 'Europe/Madrid')).toBe(1);
    });
    it('2026-05-17 (domingo) en Madrid', () => {
        expect(zonedDayOfWeek('2026-05-17', 'Europe/Madrid')).toBe(0);
    });
});
