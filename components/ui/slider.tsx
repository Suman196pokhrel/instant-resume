"use client"

import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

// SPEC §11.5 range slider (mock .slider-field): label left, value right (tabular) above a 4px track filled
// with accent; a 16px white thumb with an accent ring that grows slightly while dragged (spring).
// Single value only; `unit` is appended to the shown value (e.g. "pt", which Intl has no unit for).
function Slider({ className, label, unit, ...props }: SliderPrimitive.Root.Props<number> & { label: React.ReactNode; unit?: string }) {
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn("flex w-full flex-col gap-1", className)} {...props}>
      <div className="flex justify-between text-[13px]">
        <SliderPrimitive.Label>{label}</SliderPrimitive.Label>
        <SliderPrimitive.Value className="text-ink-2 tabular-nums">{(f) => (unit ? `${f[0]} ${unit}` : f[0])}</SliderPrimitive.Value>
      </div>
      <SliderPrimitive.Control className="relative flex h-[18px] w-full cursor-pointer touch-none items-center select-none data-disabled:cursor-not-allowed data-disabled:opacity-50">
        <SliderPrimitive.Track className="relative h-1 w-full rounded-full bg-sunken">
          <SliderPrimitive.Indicator data-slot="slider-range" className="h-full rounded-full bg-primary" />
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            className="size-4 rounded-full border-[1.5px] border-primary bg-surface shadow-knob [transition:scale_var(--t-spring)_var(--spring),box-shadow_var(--t)_var(--ease)] has-focus-visible:ring-4 has-focus-visible:ring-accent-soft data-dragging:scale-[1.2]"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
