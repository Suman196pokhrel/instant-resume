"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "cn"
import { CheckIcon, ChevronRightIcon } from "lucide-react"

// SPEC §11.5 menus (mock .pop-menu): menu / menuitem / menuitemradio semantics from Base UI. Opens with the
// "pop" (SPEC §12) from the corner nearest its button (Base UI's --transform-origin); closes with shadcn's fade.
const itemClass =
  "relative flex w-full cursor-pointer items-center gap-[9px] rounded-sm px-[9px] py-[7px] text-[13.5px] font-medium text-ink outline-none select-none data-highlighted:bg-surface-2 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&_svg:not([class*='size-'])]:size-[15px]"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 6,
  className,
  ...props
}: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner className="isolate z-50 outline-none" align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "max-h-(--available-height) min-w-[200px] origin-(--transform-origin) overflow-y-auto rounded-md border border-line bg-surface p-[5px] text-ink shadow-pop outline-none data-open:animate-pop data-closed:animate-out data-closed:duration-100 data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      className={cn("px-[9px] pt-1.5 pb-1 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & { variant?: "default" | "destructive" }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(itemClass, "data-[variant=destructive]:text-danger data-[variant=destructive]:[&_svg]:text-danger", className)}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({ className, children, ...props }: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(itemClass, "data-popup-open:bg-surface-2", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -6,
  side = "right",
  sideOffset = 0,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return <DropdownMenuContent data-slot="dropdown-menu-sub-content" align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset} {...props} />
}

function DropdownMenuCheckboxItem({ className, children, ...props }: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem data-slot="dropdown-menu-checkbox-item" className={cn(itemClass, "pr-8", className)} {...props}>
      <MenuPrimitive.CheckboxItemIndicator className="absolute right-2.5">
        <CheckIcon className="text-primary!" />
      </MenuPrimitive.CheckboxItemIndicator>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

// Picking a value closes the menu (mock model picker); Base UI keeps it open by default.
function DropdownMenuRadioItem({ className, children, closeOnClick = true, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem data-slot="dropdown-menu-radio-item" closeOnClick={closeOnClick} className={cn(itemClass, "pr-8", className)} {...props}>
      <MenuPrimitive.RadioItemIndicator className="absolute right-2.5">
        <CheckIcon className="text-primary!" />
      </MenuPrimitive.RadioItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return <MenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn("mx-0.5 my-1 h-px bg-line", className)} {...props} />
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="dropdown-menu-shortcut" className={cn("ml-auto text-xs text-muted-foreground", className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
