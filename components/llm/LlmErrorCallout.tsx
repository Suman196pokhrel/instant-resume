import Link from "next/link";
import { CircleAlert, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import type { LlmError } from "@/lib/llm/errors";

/** How every screen shows a failed LLM call (SPEC §8.3 Errors): what went wrong, what to do, and the next step. */
/** lead: what stopped, before the error itself; children: extra actions after Try again (Studio generation). */
export function LlmErrorCallout({ error, onRetry, lead, children }: { error: LlmError; onRetry?: () => void; lead?: React.ReactNode; children?: React.ReactNode }) {
  const { action } = error;
  return (
    <Callout variant="error" role="alert" data-kind={error.kind}>
      <CircleAlert />
      <div className="flex flex-col gap-1">
        {lead && <p className="mb-1">{lead}</p>}
        <p className="font-medium">{error.title}</p>
        <p className="text-ink-2">{error.message}</p>
        {error.detail && <p className="text-xs text-muted-foreground">Details: {error.detail}</p>}
        {(action || onRetry || children) && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {action &&
              (action.external ? (
                <a href={action.href} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  {action.label} <ExternalLink />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <Link href={action.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  {action.label}
                </Link>
              ))}
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
            {children}
          </div>
        )}
      </div>
    </Callout>
  );
}
