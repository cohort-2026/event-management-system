import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center", className)}>
      {icon && <div aria-hidden="true" className="mb-3 flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">{icon}</div>}
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
