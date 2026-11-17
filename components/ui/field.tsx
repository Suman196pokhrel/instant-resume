import * as React from "react"
import { cn } from "cn"

type ControlProps = { id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }

/**
 * SPEC §11.5 form field (mock .field): label (with a muted "optional"), the control, then the error. Wires the
 * control's id, aria-invalid and aria-describedby so the error is announced with it (SPEC §16).
 */
function Field({
  id,
  label,
  optional,
  error,
  aside,
  className,
  children,
}: {
  id: string
  label: React.ReactNode
  optional?: boolean
  error?: string
  /** Sits beside the control, such as a Show/Hide button. */
  aside?: React.ReactNode
  className?: string
  children: React.ReactElement<ControlProps>
}) {
  const errorId = `${id}-error`
  const control = React.cloneElement(children, { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })
  return (
    <div data-slot="field" className={cn("flex flex-col gap-[5px]", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
        {optional && <span className="ml-1 text-xs font-normal text-muted-foreground">optional</span>}
      </label>
      {aside ? (
        <div className="flex gap-1.5">
          {control}
          {aside}
        </div>
      ) : (
        control
      )}
      {error && (
        <p id={errorId} className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export { Field }
