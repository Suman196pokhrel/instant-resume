"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "cn"

// SPEC §11.5 view switches (Document tabs, Job/Checks, inspector). Two looks, both sliding Base UI's
// indicator with the spring (SPEC §12): segmented (sunken track, white thumb) and underline (2px accent bar).
// For picking a value (paper size, spelling, page budget) use Segmented instead: it is a radio group.
type Variant = "segmented" | "underline"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-3", className)} {...props} />
}

function TabsList({
  className,
  variant = "segmented",
  children,
  ...props
}: TabsPrimitive.List.Props & { variant?: Variant }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs-list relative grid auto-cols-fr grid-flow-col",
        variant === "segmented" ? "w-fit rounded-md bg-sunken p-[3px]" : "border-b border-line px-2",
        className
      )}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className={cn(
          "absolute left-0 w-(--active-tab-width) translate-x-(--active-tab-left) [transition:translate_var(--t-spring)_var(--spring),width_var(--t-spring)_var(--spring)]",
          variant === "segmented"
            ? "top-[3px] bottom-[3px] rounded-sm bg-surface shadow-thumb"
            : "-bottom-px h-0.5 rounded-full bg-primary"
        )}
      />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors duration-(--t) hover:text-ink data-active:text-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=segmented]/tabs-list:rounded-sm group-data-[variant=segmented]/tabs-list:px-3 group-data-[variant=segmented]/tabs-list:py-[5px] group-data-[variant=segmented]/tabs-list:text-[13px] group-data-[variant=segmented]/tabs-list:text-ink-2",
        "group-data-[variant=underline]/tabs-list:px-1.5 group-data-[variant=underline]/tabs-list:pt-3 group-data-[variant=underline]/tabs-list:pb-[11px] group-data-[variant=underline]/tabs-list:text-[13.5px] group-data-[variant=underline]/tabs-list:text-muted-foreground group-data-[variant=underline]/tabs-list:data-active:[&_svg]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
