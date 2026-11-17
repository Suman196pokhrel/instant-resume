"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { cn } from "cn"
import { ChevronRightIcon } from "lucide-react"

// SPEC §11.5 disclosure (mock .disclosure): a summary row whose chevron turns 90° (180 ms) and content
// that fades in. Used for the job description, parse safety and Studio notes.
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ className, children, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "group/disclosure flex cursor-pointer items-center gap-1.5 rounded-sm text-[12.5px] font-semibold text-ink-2 transition-colors duration-(--t) hover:text-ink",
        className
      )}
      {...props}
    >
      <ChevronRightIcon className="size-3.5 text-muted-foreground transition-[rotate] duration-(--t) ease-standard group-data-panel-open/disclosure:rotate-90" />
      {children}
    </CollapsiblePrimitive.Trigger>
  )
}

function CollapsibleContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn("animate-in duration-(--t) ease-standard fade-in-0", className)}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
