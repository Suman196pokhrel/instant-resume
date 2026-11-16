import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// SPEC §11.5 buttons, styled as mock/styles.css .btn and .icon-btn. Custom motion (owner rule: only where the
// mock calls for it): the press scales .97 (icon .9) and springs back on release (SPEC §12).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-[7px] rounded-md border border-transparent font-medium whitespace-nowrap no-underline outline-none select-none [transition:background-color_var(--t)_var(--ease),border-color_var(--t)_var(--ease),color_var(--t)_var(--ease),box-shadow_var(--t)_var(--ease),scale_var(--t-spring)_var(--spring)] active:not-disabled:scale-[.97] active:not-disabled:duration-(--t-fast) disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-primary hover:not-disabled:bg-accent-ink",
        ghost: "border-line-2 bg-surface text-ink hover:not-disabled:border-muted-foreground hover:not-disabled:bg-surface-2",
        "danger-ghost": "border-danger-line bg-transparent text-danger hover:not-disabled:bg-danger-soft",
        quiet: "bg-transparent text-ink-2 hover:not-disabled:bg-sunken hover:not-disabled:text-ink",
        link: "h-auto! px-0! text-accent-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 text-sm",
        sm: "h-[30px] gap-1.5 px-2.5 text-[13px]",
        icon: "size-[30px] rounded-sm border-0 bg-transparent text-ink-2 hover:not-disabled:bg-sunken hover:not-disabled:text-ink active:not-disabled:scale-90 disabled:opacity-35",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant: size === "icon" ? null : variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
