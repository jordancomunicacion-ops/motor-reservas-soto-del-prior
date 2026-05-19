import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
  {
    variants: {
      tone: {
        success: "bg-success/10 text-success border-success/20",
        warning: "bg-warning/15 text-warning-foreground border-warning/30",
        danger: "bg-destructive/10 text-destructive border-destructive/20",
        info: "bg-info/10 text-info border-info/20",
        neutral: "bg-muted text-muted-foreground border-border",
        accent: "bg-primary/10 text-primary border-primary/20",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean
}

export function StatusBadge({ className, tone, dot = true, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
