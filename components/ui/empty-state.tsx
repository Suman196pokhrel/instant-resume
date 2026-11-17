import * as React from "react"
import { cn } from "cn"

/** SPEC §11.5 empty state (mock .empty-state): dashed box, optional 54px icon tile, title, one line of help, action. */
function EmptyState({
  icon,
  title,
  children,
  action,
  size = "default",
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
  size?: "default" | "sm"
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-line-2 bg-surface-2 text-center",
        size === "sm" ? "px-5 py-8" : "px-6 py-14",
        className
      )}
    >
      {icon && <span className="mb-2 grid size-[54px] place-items-center rounded-[14px] border border-line bg-surface text-muted-foreground">{icon}</span>}
      <h3>{title}</h3>
      {children && <p className="mb-3.5 max-w-[380px] text-muted-foreground">{children}</p>}
      {action}
    </div>
  )
}

export { EmptyState }
