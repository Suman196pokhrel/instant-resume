import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// SPEC §11.5 callout (mock .callout): icon plus text; default, warn and error variants.
const calloutVariants = cva("flex gap-2.5 rounded-md border px-3 py-2.5 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", {
  variants: {
    variant: {
      default: "border-line bg-surface-2 text-ink-2",
      warn: "border-warn-line bg-warn-soft text-ink [&>svg]:text-warn",
      error: "border-danger-line bg-danger-soft text-ink [&>svg]:text-danger",
    },
  },
  defaultVariants: { variant: "default" },
})

function Callout({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof calloutVariants>) {
  return <div data-slot="callout" className={cn(calloutVariants({ variant, className }))} {...props} />
}

export { Callout }
