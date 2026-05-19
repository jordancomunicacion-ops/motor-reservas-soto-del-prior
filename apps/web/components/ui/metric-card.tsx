import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";

interface MetricCardProps {
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    change?: number | null;
    icon?: LucideIcon;
    highlight?: boolean;
    trend?: number[];
    trendColor?: string;
    className?: string;
}

/**
 * KPI compacto tipo Linear/Vercel: label corto, número grande con tabular-nums,
 * delta de cambio y sparkline opcional. Diseñado para columnas densas (4-6 en fila).
 */
export function MetricCard({
    label,
    value,
    hint,
    change,
    icon: Icon,
    highlight,
    trend,
    trendColor,
    className,
}: MetricCardProps) {
    const hasChange = typeof change === "number";
    const isUp = (change ?? 0) >= 0;

    return (
        <div
            className={cn(
                "group relative rounded-md border bg-card p-4 transition-colors",
                "hover:bg-accent/30",
                highlight
                    ? "border-primary/30 bg-primary/[0.03]"
                    : "border-border/70",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
                    {label}
                </p>
                {Icon && (
                    <Icon className="size-3.5 text-muted-foreground/70 shrink-0" />
                )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-semibold text-foreground text-display-num leading-none">
                    {value}
                </span>
                {hasChange && (
                    <span
                        className={cn(
                            "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
                            isUp ? "text-success" : "text-destructive",
                        )}
                    >
                        {isUp
                            ? <ArrowUpRight className="size-3" />
                            : <ArrowDownRight className="size-3" />}
                        {Math.abs(change!)}%
                    </span>
                )}
            </div>

            {trend && trend.length > 0 && (
                <div className="-mx-1 mb-1">
                    <Sparkline
                        data={trend}
                        color={trendColor ?? (isUp ? "var(--success)" : "var(--destructive)")}
                        width={200}
                        height={28}
                        strokeWidth={1.25}
                        className="w-full h-7"
                    />
                </div>
            )}

            {hint && (
                <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
            )}
        </div>
    );
}
