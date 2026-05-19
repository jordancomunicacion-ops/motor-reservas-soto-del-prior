import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  change?: number | null
  icon?: LucideIcon
  highlight?: boolean
  className?: string
}

export function MetricCard({
  label,
  value,
  hint,
  change,
  icon: Icon,
  highlight,
  className,
}: MetricCardProps) {
  const hasChange = typeof change === "number"
  const isUp = (change ?? 0) >= 0

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md gap-3 py-5",
        highlight && "ring-1 ring-primary/20 bg-primary/[0.03]",
        className
      )}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-eyebrow">{label}</p>
          {Icon && (
            <span className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div className="space-y-1">
          <div className="font-display text-3xl font-medium tracking-tight text-foreground tabular-nums leading-none">
            {value}
          </div>
          {(hint || hasChange) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {hasChange && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    isUp ? "text-success" : "text-destructive"
                  )}
                >
                  {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {Math.abs(change!)}%
                </span>
              )}
              {hint && <span>{hint}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
