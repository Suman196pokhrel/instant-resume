"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// SPEC §11.5 dialog (mock .modal): 480px (720px wide), header with title and close ×, body, footer right-aligned
// with a destructive action pushed far left. Base UI traps focus, closes on Escape and returns focus.
// Motion (SPEC §12): backdrop fades with --t; the panel moves up 8px and scales .97 → 1 with the spring.
function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogContent({
  className,
  children,
  size = "default",
  ...props
}: DialogPrimitive.Popup.Props & { size?: "default" | "wide" }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-ink/35 transition-opacity duration-(--t) ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100vh-32px)] w-[min(480px,calc(100%-32px))] flex-col rounded-lg bg-surface text-sm text-ink shadow-pop outline-none",
          "[transition:opacity_var(--t)_var(--ease),translate_var(--t-spring)_var(--spring),scale_var(--t-spring)_var(--spring)] data-ending-style:translate-y-2 data-ending-style:scale-[.97] data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:scale-[.97] data-starting-style:opacity-0",
          size === "wide" && "w-[min(720px,calc(100%-32px))]",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex items-center justify-between gap-3 px-[18px] pt-4 pb-2", className)} {...props}>
      <div className="flex flex-col gap-1">{children}</div>
      <DialogPrimitive.Close render={<Button size="icon" aria-label="Close" />}>
        <XIcon />
      </DialogPrimitive.Close>
    </div>
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-body" className={cn("overflow-auto px-[18px] pt-1.5 pb-3.5", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex justify-end gap-2 border-t border-line px-[18px] py-3 [&>[data-variant=danger-ghost]]:mr-auto",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-[17px] font-semibold", className)} {...props} />
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-ink-2", className)} {...props} />
}

export { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger }
