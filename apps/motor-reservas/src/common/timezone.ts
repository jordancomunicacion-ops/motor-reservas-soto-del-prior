/**
 * DST-correcto: usamos Intl.DateTimeFormat para descubrir el offset efectivo
 * de la zona en ese instante. Iteramos dos veces para resolver los saltos DST
 * (en la "spring forward" la primera estimación puede caer en el hueco).
 */
export function zonedDateToUtc(yyyyMmDd: string, hhMm: string, timezone: string): Date {
    const [y, mo, d] = yyyyMmDd.split('-').map(Number);
    const [h, mi] = hhMm.split(':').map(Number);
    if ([y, mo, d, h, mi].some(n => !Number.isFinite(n))) {
        throw new Error(`zonedDateToUtc: fecha/hora inválida (${yyyyMmDd} ${hhMm})`);
    }

    const targetUtcMs = Date.UTC(y, mo - 1, d, h, mi, 0, 0);

    const offsetMs = (utcMs: number): number => {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).formatToParts(new Date(utcMs));
        const map: Record<string, number> = {};
        for (const p of parts) {
            if (p.type !== 'literal') map[p.type] = Number(p.value);
        }
        const zonedAsUtcMs = Date.UTC(
            map.year, map.month - 1, map.day,
            map.hour === 24 ? 0 : map.hour,
            map.minute, map.second,
        );
        return zonedAsUtcMs - utcMs;
    };

    let utcMs = targetUtcMs - offsetMs(targetUtcMs);
    utcMs = targetUtcMs - offsetMs(utcMs);
    return new Date(utcMs);
}

/** Rango UTC [start, end] del día civil yyyy-mm-dd en la zona dada. */
export function zonedDayRangeUtc(yyyyMmDd: string, timezone: string): { start: Date; end: Date } {
    const start = zonedDateToUtc(yyyyMmDd, '00:00', timezone);
    const [y, mo, d] = yyyyMmDd.split('-').map(Number);
    const next = new Date(Date.UTC(y, mo - 1, d + 1));
    const nextStr = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
    const nextStart = zonedDateToUtc(nextStr, '00:00', timezone);
    return { start, end: new Date(nextStart.getTime() - 1) };
}

/** YYYY-MM-DD canonical: si el input es string ISO/short, recorta; si es Date, usa los componentes UTC. */
export function toDateOnlyString(input: string | Date): string {
    if (typeof input === 'string') {
        const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        return toDateOnlyString(new Date(input));
    }
    return `${input.getUTCFullYear()}-${String(input.getUTCMonth() + 1).padStart(2, '0')}-${String(input.getUTCDate()).padStart(2, '0')}`;
}

/** Day-of-week (0-6, dom=0) del día civil yyyy-mm-dd en la zona dada. */
export function zonedDayOfWeek(yyyyMmDd: string, timezone: string): number {
    const utc = zonedDateToUtc(yyyyMmDd, '12:00', timezone); // 12:00 evita ambigüedades de DST
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
    }).formatToParts(utc);
    const wd = parts.find(p => p.type === 'weekday')?.value || '';
    return ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[wd];
}
