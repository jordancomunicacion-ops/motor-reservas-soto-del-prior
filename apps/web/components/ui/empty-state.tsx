import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  tone?: "default" | "danger"
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 gap-3",
        className
      )}
    >
      {Icon && (
        <span
          className={cn(
            "grid place-items-center size-12 rounded-full",
            tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="font-display text-lg font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
