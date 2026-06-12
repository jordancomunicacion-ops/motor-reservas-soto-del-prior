"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface MonthlySeries {
    /** Etiqueta de la serie (p. ej. el año: "2026"). */
    label: string;
    /** 12 valores, índice 0 = enero. */
    data: number[];
    color: string;
}

interface MonthlyBarChartProps {
    /** Series a comparar (una por año), en orden cronológico. */
    series: MonthlySeries[];
    /** Formatea el valor mostrado sobre cada barra y en el tooltip. */
    formatValue?: (v: number) => string;
    className?: string;
}

/** % de variación del último año seleccionado vs el anterior. */
function pctChange(curr: number, prev: number): number {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
}

/**
 * Gráfica de barras de 12 meses (ene-dic) sin dependencias, con comparación
 * entre años: una barra por serie y mes. Los valores se muestran siempre
 * sobre cada mes, coloreados como su año; con exactamente dos años se añade
 * la variación porcentual.
 */
export function MonthlyBarChart({
    series,
    formatValue = (v) => v.toLocaleString("es-ES"),
    className,
}: MonthlyBarChartProps) {
    const allValues = series.flatMap(s => s.data);
    const hasData = allValues.some(v => v > 0);
    const max = Math.max(1, ...allValues);
    const currentMonth = new Date().getMonth();
    // Si la serie más reciente es el año en curso, los meses futuros aún no
    // tienen datos: no tiene sentido mostrar su variación (-100% espurio).
    const latestIsCurrentYear =
        series.length > 0 && Number(series[series.length - 1].label) === new Date().getFullYear();

    return (
        <div className={cn("w-full", className)}>
            <div className="flex items-center gap-3 mb-2">
                {series.map(s => (
                    <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium tabular-nums" style={{ color: s.color }}>
                        <span
                            className="size-2 rounded-[2px] shrink-0"
                            style={{ backgroundColor: s.color }}
                        />
                        {s.label}
                    </span>
                ))}
            </div>
            <div className="relative flex items-end gap-1.5 h-44">
                {!hasData && (
                    <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                        Sin datos en los años seleccionados
                    </p>
                )}
                {MONTH_LABELS.map((label, i) => {
                    const values = series.map(s => s.data[i] ?? 0);
                    const isFutureMonth = latestIsCurrentYear && i > currentMonth;
                    const delta = series.length === 2 && !isFutureMonth ? pctChange(values[1], values[0]) : null;
                    const tooltip = series
                        .map(s => `${s.label}: ${formatValue(s.data[i] ?? 0)}`)
                        .join(" · ");
                    return (
                        <div key={label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            <div className="flex flex-col items-center leading-tight max-w-full">
                                {series.map((s, j) => (
                                    <span
                                        key={s.label}
                                        className="text-[9px] tabular-nums truncate max-w-full"
                                        style={{ color: s.color, opacity: values[j] > 0 ? 1 : 0.35 }}
                                    >
                                        {formatValue(values[j])}
                                    </span>
                                ))}
                                {delta !== null && (
                                    <span className={cn(
                                        "text-[9px] font-medium tabular-nums",
                                        delta >= 0 ? "text-success" : "text-destructive",
                                    )}>
                                        {delta >= 0 ? "+" : ""}{delta}%
                                    </span>
                                )}
                            </div>
                            <div className="w-full flex-1 flex items-end justify-center gap-px" title={`${label}: ${tooltip}`}>
                                {series.map((s, j) => {
                                    const value = values[j];
                                    const heightPct = (value / max) * 100;
                                    return (
                                        <div
                                            key={s.label}
                                            className="flex-1 rounded-t-sm min-w-0"
                                            style={{
                                                height: `${Math.max(heightPct, value > 0 ? 3 : 1)}%`,
                                                backgroundColor: value > 0 ? s.color : "var(--muted)",
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            <span
                                className={cn(
                                    "text-[10px] text-muted-foreground",
                                    i === currentMonth && "font-semibold text-foreground",
                                )}
                            >
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
