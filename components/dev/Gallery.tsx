"use client";

import { addTransitionType, startTransition, useState, ViewTransition } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-4">{title}</h2>
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </section>
  );
}

export function Gallery() {
  const [step, setStep] = useState(1);
  const go = (delta: 1 | -1) =>
    startTransition(() => {
      addTransitionType(delta > 0 ? "forward" : "back");
      setStep((s) => s + delta);
    });

  return (
    <>
      <Section title="Tooltips">
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" />}>Tooltip A</TooltipTrigger>
          <TooltipContent title="Title">Tooltip A text</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" />}>Tooltip B</TooltipTrigger>
          <TooltipContent>Tooltip B text</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" />}>Tooltip below</TooltipTrigger>
          <TooltipContent side="bottom">Placed below</TooltipContent>
        </Tooltip>
      </Section>

      <Section title="Buttons">
        <Button>Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger-ghost">Danger</Button>
        <Button variant="quiet">Quiet</Button>
        <Button variant="link">Link</Button>
        <Button size="sm">Small</Button>
        <Button size="sm" variant="ghost">Small ghost</Button>
        <Button size="icon" aria-label="Undo">
          <Undo2 />
        </Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Toasts">
        <Button variant="ghost" onClick={() => toast("Saved to knowledge base")}>
          Show toast
        </Button>
        <Button variant="ghost" onClick={() => toast("Application deleted", { action: { label: "Undo", onClick: () => toast("Restored") } })}>
          Show toast with action
        </Button>
        <Button variant="ghost" onClick={() => toast("Something went wrong", { kind: "error" })}>
          Show error toast
        </Button>
      </Section>

      <Section title="Transitions">
        <div className="w-full">
          <ViewTransition
            key={step}
            enter={{ forward: "step-in-forward", back: "step-in-back", default: "none" }}
            exit={{ forward: "step-out-forward", back: "step-out-back", default: "none" }}
            default="none"
          >
            <div className="mb-4 rounded-md border border-line bg-surface-2 p-4">
              <h3>Step {step}</h3>
              <p className="mt-1 text-muted-foreground">Next slides left, back slides right. The page around it stays put.</p>
            </div>
          </ViewTransition>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={step === 1} onClick={() => go(-1)}>
              Previous step
            </Button>
            <Button disabled={step === 3} onClick={() => go(1)}>
              Next step
            </Button>
          </div>
        </div>
      </Section>
      <div aria-hidden className="h-[120vh]" />
    </>
  );
}
