import * as React from "react";
import { cn } from "@/lib/utils";

interface SparklineProps extends Omit<React.SVGAttributes<SVGSVGElement>, "fill" | "width" | "height"> {
    data: number[];
    color?: string;
    fill?: boolean;
    width?: number;
    height?: number;
    strokeWidth?: number;
}

/**
 * SVG sparkline ligero (sin deps). Acepta serie de números y la dibuja
 * normalizada al espacio del SVG.
 *
 * Uso:
 *   <Sparkline data={[3, 5, 4, 8, 6, 9, 11, 10, 13]} />
 *   <Sparkline data={trend} color="var(--success)" fill />
 */
export function Sparkline({
    data,
    color = "currentColor",
    fill = true,
    width = 120,
    height = 36,
    strokeWidth = 1.5,
    className,
    ...props
}: SparklineProps) {
    if (!data || data.length === 0) {
        return (
            <div
                className={cn("h-9 bg-muted/30 rounded-sm", className)}
                style={{ width, height }}
                aria-hidden
            />
        );
    }

    const n = data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padX = 1;
    const padY = 2;
    const w = width - padX * 2;
    const h = height - padY * 2;

    const toX = (i: number) => padX + (i / Math.max(n - 1, 1)) * w;
    const toY = (v: number) => padY + h - ((v - min) / range) * h;

    const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const areaPath = `M ${toX(0)} ${padY + h} L ${data.map((v, i) => `${toX(i)} ${toY(v)}`).join(" L ")} L ${toX(n - 1)} ${padY + h} Z`;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            preserveAspectRatio="none"
            className={cn("block overflow-visible text-primary", className)}
            {...props}
        >
            {fill && (
                <path
                    d={areaPath}
                    fill={color}
                    fillOpacity={0.12}
                />
            )}
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
