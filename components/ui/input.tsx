import * as React from "react"
import { cn } from "cn"

// SPEC §11.5 text fields (mock styles.css input, select, textarea): 1px --line-2 border, accent border and a 3px
// accent-soft ring on focus, danger border when aria-invalid.
const fieldClass =
  "w-full rounded-sm border border-line-2 bg-surface px-2.5 py-[7px] text-sm leading-[1.45] text-ink outline-none transition-[border-color,box-shadow] duration-(--t) ease-standard placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-accent-soft focus-visible:outline-none aria-invalid:border-danger disabled:opacity-50"

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" type={type} autoComplete="off" className={cn(fieldClass, className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldClass, "resize-y", className)} {...props} />
}

/** A native <select> styled as the other fields (keyboard and screen readers get the platform's own list). */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="native-select" className={cn(fieldClass, className)} {...props} />
}

export { Input, NativeSelect, Textarea }
