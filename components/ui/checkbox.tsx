"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "cn"
import { CheckIcon } from "lucide-react"

// SPEC §11.5 option-row checkbox: 18px, 5px radius, accent fill with a white tick; presses to .86 and
// springs back on release (SPEC §12, same pattern as Button).
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "relative inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] border-line-2 bg-surface text-primary-foreground [transition:background-color_var(--t)_var(--ease),border-color_var(--t)_var(--ease),scale_var(--t-spring)_var(--spring)] active:not-data-disabled:scale-[.86] active:not-data-disabled:duration-(--t-fast) aria-invalid:border-danger data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-content-center">
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
