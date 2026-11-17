import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// SPEC §11.5 pill (Badge), metric pill (mock .metric), chip and count badge.
const pillVariants = cva("inline-flex h-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs whitespace-nowrap", {
  variants: {
    variant: {
      default: "bg-sunken font-medium text-ink-2",
      ok: "bg-accent-soft font-medium text-accent-ink",
      warn: "bg-warn-soft font-medium text-warn",
      metric: "bg-accent-soft font-semibold text-accent-ink",
    },
  },
  defaultVariants: { variant: "default" },
})

function Pill({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof pillVariants>) {
  return <span data-slot="pill" className={cn(pillVariants({ variant, className }))} {...props} />
}

function Chip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chip"
      className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-[9px] py-[3px] text-[12.5px] text-ink-2", className)}
      {...props}
    />
  )
}

function Count({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="count"
      className={cn("inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sunken px-[5px] text-[11px] font-semibold text-ink-2", className)}
      {...props}
    />
  )
}

export { Chip, Count, Pill }
