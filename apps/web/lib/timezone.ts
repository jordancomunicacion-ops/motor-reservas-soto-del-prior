// Helpers para formatear fechas en una zona horaria concreta (por defecto la
// del restaurante/hotel). Espejo simplificado de motor-reservas/src/common/timezone.ts.

export const DEFAULT_TZ = 'Europe/Madrid';

function partsOf(date: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;
    return map;
}

/** "HH:mm" del instante `date` interpretado en `timezone`. */
export function formatTimeInTz(date: Date | string | null | undefined, timezone: string = DEFAULT_TZ, fallback = '--:--'): string {
    if (!date) return fallback;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return fallback;
    const p = partsOf(d, timezone);
    return `${p.hour}:${p.minute}`;
}

/** "DD/MM" del instante `date` en `timezone`. */
export function formatDayMonthInTz(date: Date | string | null | undefined, timezone: string = DEFAULT_TZ, fallback = '--/--'): string {
    if (!date) return fallback;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return fallback;
    const p = partsOf(d, timezone);
    return `${p.day}/${p.month}`;
}

/** "YYYY-MM-DD" del instante `date` en `timezone` (día civil en esa zona). */
export function formatDateOnlyInTz(date: Date | string | null | undefined, timezone: string = DEFAULT_TZ): string {
    const d = !date ? new Date() : (date instanceof Date ? date : new Date(date));
    const p = partsOf(d, timezone);
    return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Convierte una fecha civil (YYYY-MM-DD) y hora (HH:mm) entendidas en `timezone`
 * al instante UTC correspondiente. DST-correcto: itera dos veces para resolver
 * "spring forward". Mismo algoritmo que el helper del motor.
 */
export function zonedDateToUtc(yyyyMmDd: string, hhMm: string, timezone: string = DEFAULT_TZ): Date {
    const [y, mo, d] = yyyyMmDd.split('-').map(Number);
    const [h, mi] = hhMm.split(':').map(Number);
    if ([y, mo, d, h, mi].some(n => !Number.isFinite(n))) {
        throw new Error(`zonedDateToUtc: fecha/hora inválida (${yyyyMmDd} ${hhMm})`);
    }
    const targetUtcMs = Date.UTC(y, mo - 1, d, h, mi, 0, 0);

    const offsetMs = (utcMs: number): number => {
        const p = partsOf(new Date(utcMs), timezone);
        const hour = Number(p.hour) === 24 ? 0 : Number(p.hour);
        const zonedAsUtcMs = Date.UTC(
            Number(p.year), Number(p.month) - 1, Number(p.day),
            hour, Number(p.minute), Number(p.second),
        );
        return zonedAsUtcMs - utcMs;
    };

    let utcMs = targetUtcMs - offsetMs(targetUtcMs);
    utcMs = targetUtcMs - offsetMs(utcMs);
    return new Date(utcMs);
}
