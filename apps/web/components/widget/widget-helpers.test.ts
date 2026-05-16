import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { computeDayStatus, shouldRequireStripe } from './widget-helpers';
import type { Closure, Shift } from './widget-types';

describe('computeDayStatus', () => {
    // Congelamos el "hoy" para que las fechas pasadas/futuras sean deterministas.
    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-20T10:00:00Z'));
    });
    afterAll(() => {
        vi.useRealTimers();
    });

    // Miércoles 2026-05-20.
    const wednesday = new Date('2026-05-20T12:00:00Z');
    const allDaysShift: Shift = { daysOfWeek: '0,1,2,3,4,5,6' };

    it('una fecha pasada → closed', () => {
        const yesterday = new Date('2026-05-19T12:00:00Z');
        expect(computeDayStatus(yesterday, [], [allDaysShift], [])).toBe('closed');
    });

    it('día sin shifts activos → closed', () => {
        const onlyWeekend: Shift = { daysOfWeek: '6,0' }; // sáb,dom
        expect(computeDayStatus(wednesday, [], [onlyWeekend], [])).toBe('closed');
    });

    it('día dentro de un closure simple (sin endDate) → closed', () => {
        const closure: Closure = { date: '2026-05-20', endDate: null };
        expect(computeDayStatus(wednesday, [closure], [allDaysShift], [])).toBe('closed');
    });

    it('día dentro de un closure con rango → closed', () => {
        const closure: Closure = { date: '2026-05-18', endDate: '2026-05-22' };
        expect(computeDayStatus(wednesday, [closure], [allDaysShift], [])).toBe('closed');
    });

    it('día justo fuera del closure → respeta shifts', () => {
        const closure: Closure = { date: '2026-05-18', endDate: '2026-05-19' };
        expect(computeDayStatus(wednesday, [closure], [allDaysShift], [])).toBe('available');
    });

    it('día con evento programado → event', () => {
        expect(computeDayStatus(wednesday, [], [allDaysShift], ['2026-05-20'])).toBe('event');
    });

    it('día normal con shifts → available', () => {
        expect(computeDayStatus(wednesday, [], [allDaysShift], [])).toBe('available');
    });

    it('closure tiene prioridad sobre evento', () => {
        const closure: Closure = { date: '2026-05-20', endDate: null };
        expect(computeDayStatus(wednesday, [closure], [allDaysShift], ['2026-05-20'])).toBe('closed');
    });

    it('shifts con espacios en los días los acepta', () => {
        const shift: Shift = { daysOfWeek: '1, 2, 3, 4, 5' };
        expect(computeDayStatus(wednesday, [], [shift], [])).toBe('available');
    });
});

describe('shouldRequireStripe', () => {
    it('false si widgetConfig es null/undefined', () => {
        expect(shouldRequireStripe(null, 2, false)).toBe(false);
        expect(shouldRequireStripe(undefined, 2, false)).toBe(false);
    });

    it('false si stripeEnabled es false aunque las demás reglas lo pidan', () => {
        expect(
            shouldRequireStripe({ stripeEnabled: false, noShowFeeAll: true }, 2, true),
        ).toBe(false);
    });

    it('true si noShowFeeAll está activo', () => {
        expect(shouldRequireStripe({ stripeEnabled: true, noShowFeeAll: true }, 2, false)).toBe(true);
    });

    it('true para grupos cuando pax >= noShowGroupMinPax', () => {
        const cfg = { stripeEnabled: true, noShowFeeGroups: true, noShowGroupMinPax: 8 };
        expect(shouldRequireStripe(cfg, 8, false)).toBe(true);
        expect(shouldRequireStripe(cfg, 9, false)).toBe(true);
    });

    it('false para grupos cuando pax < noShowGroupMinPax', () => {
        const cfg = { stripeEnabled: true, noShowFeeGroups: true, noShowGroupMinPax: 8 };
        expect(shouldRequireStripe(cfg, 7, false)).toBe(false);
    });

    it('true en evento si noShowFeeEvents está activo y hasEvent', () => {
        const cfg = { stripeEnabled: true, noShowFeeEvents: true };
        expect(shouldRequireStripe(cfg, 2, true)).toBe(true);
    });

    it('false en evento si noShowFeeEvents está activo pero hasEvent=false', () => {
        const cfg = { stripeEnabled: true, noShowFeeEvents: true };
        expect(shouldRequireStripe(cfg, 2, false)).toBe(false);
    });

    it('false si ninguna regla aplica aunque stripeEnabled=true', () => {
        expect(shouldRequireStripe({ stripeEnabled: true }, 2, false)).toBe(false);
    });
});
