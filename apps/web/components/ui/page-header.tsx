import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 pb-6 border-b border-border/60 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className
      )}
      {...props}
    >
      <div className="space-y-1.5">
        {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-medium tracking-tight text-foreground sm:text-[28px] leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
