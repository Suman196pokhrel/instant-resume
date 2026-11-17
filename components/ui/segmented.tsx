"use client"

import * as React from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { cn } from "cn"

// SPEC §11.5 segmented control for picking a value (paper size, spelling, page budget): a radio group
// (arrow keys move the choice) that looks like the segmented tabs; the thumb slides with the spring (mock .seg).
type Option<V extends string> = { value: V; label: React.ReactNode }

function Segmented<V extends string>({
  options,
  value,
  defaultValue,
  onValueChange,
  className,
  style,
  ...props
}: Omit<RadioGroup.Props<V>, "value" | "defaultValue" | "onValueChange" | "children"> & {
  options: Option<V>[]
  value?: V
  defaultValue?: V
  onValueChange?: (value: V) => void
}) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  const i = options.findIndex((o) => o.value === current)
  return (
    <RadioGroup
      data-slot="segmented"
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => {
        setInner(v as V)
        onValueChange?.(v as V)
      }}
      className={cn("relative inline-grid w-fit auto-cols-fr grid-flow-col rounded-md bg-sunken p-[3px]", className)}
      style={{ ...style, "--n": options.length, "--i": Math.max(i, 0) } as React.CSSProperties}
      {...props}
    >
      <span
        data-slot="segmented-thumb"
        aria-hidden
        className={cn(
          "absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/var(--n))] translate-x-[calc(var(--i)*100%)] rounded-sm bg-surface shadow-thumb [transition:translate_var(--t-spring)_var(--spring)]",
          i < 0 && "opacity-0"
        )}
      />
      {options.map((o) => (
        <Radio.Root
          key={o.value}
          value={o.value}
          nativeButton
          render={<button type="button" />}
          className="relative inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 py-[5px] text-[13px] font-medium whitespace-nowrap text-ink-2 transition-colors duration-(--t) hover:text-ink data-checked:text-ink"
        >
          {o.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  )
}

export { Segmented }
