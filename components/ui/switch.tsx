"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

// SPEC §11.5 switch: 38×22 track, accent when on, knob slides with the spring (SPEC §12), and an
// "On"/"Off" text next to it (mock .toggle). The text is decoration; the switch role carries the state.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <span data-slot="switch-field" className="inline-flex items-center gap-2.5">
      <SwitchPrimitive.Root
        data-slot="switch"
        className={cn(
          "peer relative inline-block h-[22px] w-[38px] shrink-0 cursor-pointer rounded-full bg-line-2 transition-colors duration-(--t) data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="absolute top-[3px] left-[3px] size-4 rounded-full bg-surface shadow-knob [transition:translate_var(--t-spring)_var(--spring)] data-checked:translate-x-4"
        />
      </SwitchPrimitive.Root>
      <span aria-hidden className="min-w-[22px] text-[13px] font-medium peer-data-checked:hidden">Off</span>
      <span aria-hidden className="hidden min-w-[22px] text-[13px] font-medium peer-data-checked:inline">On</span>
    </span>
  )
}

export { Switch }
