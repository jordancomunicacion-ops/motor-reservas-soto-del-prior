import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}

/**
 * Cabecera estándar de páginas admin. Estilo tech-SaaS compacto:
 * eyebrow + título sans semibold tight + descripción + acciones a la derecha.
 */
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
        "flex flex-col gap-3 pb-5 border-b border-border/60 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-[22px] leading-tight">
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
