"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// SPEC §11.5 toast, styled as mock/styles.css .toast: ink background, light text, mint action, red error
// variant, bottom centre. Light theme only (SPEC §21). Enter/exit keep sonner's built-in animation.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      offset={20}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--ink)",
          "--normal-text": "var(--bg)",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // sized to its text and centred, like the mock (Tailwind's translate is its own property, so sonner's transform still stacks)
          toast: "cn-toast w-fit! max-w-(--width) left-1/2! right-auto! -translate-x-1/2 gap-3.5! px-3.5! py-2.5! font-sans! text-[13.5px]! shadow-pop!",
          error: "[--normal-bg:var(--danger)]",
          actionButton: "bg-transparent! p-0! text-[13.5px]! font-semibold! text-toast-action!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
