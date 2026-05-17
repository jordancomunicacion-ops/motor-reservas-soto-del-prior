/**
 * Convierte una fecha local (YYYY-MM-DD HH:mm) en una zona IANA a un Date UTC.
 * Maneja DST correctamente usando Intl.DateTimeFormat para descubrir el offset
 * efectivo de la zona en ese instante.
 *
 * Implementación: tomamos el "guess UTC" (interpretar los componentes como si
 * fueran UTC) y consultamos qué hora local devuelve esa zona para ese instante.
 * La diferencia entre el guess y la hora local devuelta es el offset; restando
 * el offset al guess obtenemos el UTC real. Iteramos dos veces para resolver
 * los saltos DST.
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
            second: '2-digit'
        }).formatToParts(new Date(utcMs));
        const map: Record<string, number> = {};
        for (const p of parts) {
            if (p.type !== 'literal') map[p.type] = Number(p.value);
        }
        const zonedAsUtcMs = Date.UTC(
            map.year, map.month - 1, map.day,
            map.hour === 24 ? 0 : map.hour,
            map.minute, map.second
        );
        return zonedAsUtcMs - utcMs;
    };

    let utcMs = targetUtcMs - offsetMs(targetUtcMs);
    utcMs = targetUtcMs - offsetMs(utcMs);
    return new Date(utcMs);
}

/**
 * Devuelve el rango UTC [start, end] que corresponde al día civil (00:00–23:59:59.999)
 * de la fecha dada en la zona indicada.
 */
export function zonedDayRangeUtc(yyyyMmDd: string, timezone: string): { start: Date; end: Date } {
    const start = zonedDateToUtc(yyyyMmDd, '00:00', timezone);
    // El final del día = inicio del día siguiente - 1ms.
    const [y, mo, d] = yyyyMmDd.split('-').map(Number);
    const next = new Date(Date.UTC(y, mo - 1, d + 1));
    const nextStr = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
    const nextStart = zonedDateToUtc(nextStr, '00:00', timezone);
    return { start, end: new Date(nextStart.getTime() - 1) };
}

/**
 * Extrae YYYY-MM-DD a partir de un string ISO o Date, interpretando solo
 * la parte de fecha. Útil para acoplar input "date" del cliente.
 */
export function toDateOnlyString(input: string | Date): string {
    if (typeof input === 'string') {
        // Si ya viene como YYYY-MM-DD lo devolvemos tal cual; si es ISO, cortamos.
        const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        const d = new Date(input);
        return toDateOnlyString(d);
    }
    return `${input.getUTCFullYear()}-${String(input.getUTCMonth() + 1).padStart(2, '0')}-${String(input.getUTCDate()).padStart(2, '0')}`;
}
