"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLlmChoice } from "@/lib/llm/use-choice";
import type { Prefs } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";

/** "Get set up" (SPEC §13.1, mock setupChecklistHtml): three first-run steps above the dashboard, until done or dismissed. */
export function SetupChecklist({ hasKb, hasProject, prefs }: { hasKb: boolean; hasProject: boolean; prefs: Prefs }) {
  const { connections } = useLlmChoice();
  const [dismissed, setDismissed] = useState(prefs.dismissedOnboardingBanner);
  if (!connections || dismissed) return null; // connections live in this browser: wait for them so the count never jumps

  const steps = [
    { done: connections.length > 0, title: "Connect your AI provider", detail: "Paste an API key from Anthropic, OpenAI or Gemini. You pay your provider directly.", href: "/settings", cta: "Add a key" },
    { done: hasKb, title: "Add your background", detail: "Import your resume and review what was found. About 2 minutes.", href: "/import", cta: "Import resume", alt: { href: "/onboarding", label: "or enter it manually" } },
    { done: hasProject, title: "Make your first application", detail: "Paste a job ad and get a tailored resume and cover letter in about 15 seconds.", href: "/new/quick", cta: "Quick generate" },
  ];
  const n = steps.filter((s) => s.done).length;
  if (n === steps.length) return null;
  const next = steps.findIndex((s) => !s.done);

  async function dismiss() {
    setDismissed(true);
    const res = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...prefs, dismissedOnboardingBanner: true }) }).catch(() => null);
    if (res?.ok) return;
    setDismissed(false);
    toast("Couldn't hide the checklist. Try again.", { kind: "error" });
  }

  return (
    <section aria-labelledby="setup-h" className="mb-[22px] rounded-lg border border-accent-line bg-surface px-[18px] py-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 id="setup-h" className="mb-0.5 text-base">
            Get set up
          </h2>
          <span className="text-[13px] text-muted-foreground">{`${n} of ${steps.length} done`}</span>
        </div>
        <Button size="icon" aria-label="Dismiss setup checklist" onClick={dismiss}>
          <X />
        </Button>
      </div>
      <ol>
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5">
            <span aria-hidden className={cn("grid size-[22px] flex-none place-items-center rounded-full text-[11.5px] font-semibold", s.done ? "bg-primary text-primary-foreground" : "bg-sunken text-ink-2")}>
              {s.done ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span className="flex min-w-[200px] flex-1 flex-col gap-0.5">
              <strong className={cn(s.done && "text-ink-2")}>
                {s.title}
                {s.done && <span className="sr-only"> (done)</span>}
              </strong>
              <span className="text-[13px] text-muted-foreground">{s.detail}</span>
            </span>
            {!s.done && (
              <span className="flex items-center gap-2.5">
                <Link href={s.href} data-variant={i === next ? "primary" : "ghost"} className={buttonVariants({ size: "sm", variant: i === next ? "primary" : "ghost" })}>
                  {s.cta}
                </Link>
                {s.alt && (
                  <Link href={s.alt.href} className="text-[13px] text-accent-ink">
                    {s.alt.label}
                  </Link>
                )}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
