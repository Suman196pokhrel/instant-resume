"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Info, Sparkles } from "lucide-react";
import { cn } from "cn";
import { LlmErrorCallout } from "@/components/llm/LlmErrorCallout";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Chip } from "@/components/ui/pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Project } from "@/lib/schemas/project";
import { sectionText } from "@/lib/doc/plain-text";
import { fitDocuments } from "@/lib/generate/fit";
import { generateDocuments } from "@/lib/generate/generate";
import { getAdapter } from "@/lib/llm/adapter";
import { LlmError, outputError } from "@/lib/llm/errors";
import { useLlmChoice } from "@/lib/llm/use-choice";
import { kwMatch, matchedKeywords } from "@/lib/match/keywords";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";
import { useWorkspace } from "@/lib/stores/workspace";
import { toast } from "@/lib/toast";
import { KIND_LABEL } from "./Workspace";
import { employer } from "@/lib/doc/filename";

// Job panel (left), Job tab (SPEC §14.5; mock views-workspace.js renderLeft 'job'). TASK-21 adds the Checks tab beside it.

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<button type="button" aria-label={text} className="inline-grid size-[18px] cursor-help place-items-center rounded-full text-muted-foreground transition-colors duration-(--t) ease-(--ease) outline-none hover:bg-accent-soft hover:text-accent-ink focus-visible:bg-accent-soft focus-visible:text-accent-ink" />}
      >
        <Info className="size-[13px]" />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2">{children}</div>;
const Count = ({ children }: { children: React.ReactNode }) => <span className="ml-auto font-medium text-muted-foreground tabular-nums">{children}</span>;

export function JobPanel({ project, kb, prefs }: { project: Project; kb: KnowledgeBase; prefs: Prefs }) {
  const { brief } = project;
  const kind = useWorkspace((s) => s.kind);
  const doc = useWorkspace((s) => s.docs[s.kind]);
  const docs = useWorkspace((s) => s.docs);
  const notes = useWorkspace((s) => s.notes);
  const setNotes = useWorkspace((s) => s.setNotes);
  const busy = useWorkspace((s) => !!s.busy || s.regenerating);
  const setRegenerating = useWorkspace((s) => s.setRegenerating);
  const regenerate = useWorkspace((s) => s.regenerate);
  const { active } = useLlmChoice();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<LlmError | null>(null);
  const run = useRef<AbortController | null>(null);
  useEffect(() => () => run.current?.abort(), []); // leaving the page drops the call

  const noun = KIND_LABEL[kind].toLowerCase();
  const matched = matchedKeywords((doc?.sections ?? []).filter((s) => !s.hidden).map(sectionText).join(" "), brief.keywords);
  // A requirement is reflected when a job keyword it mentions appears in this document; one without keywords is unmarked.
  const reqs = brief.requirements.map((r) => {
    const kws = brief.keywords.filter((k) => kwMatch(r, k));
    return { r, state: !kws.length ? "none" : kws.some((k) => matched.includes(k)) ? "ok" : "miss" };
  });
  const model = active?.model ?? "your model";

  async function go() {
    setOpen(false);
    setError(null);
    const controller = new AbortController();
    run.current = controller;
    setRegenerating(true);
    toast(`Regenerating with ${model}…`);
    try {
      const out = await generateDocuments({ kb, brief, selected: project.selected, notes, tone: prefs.quick.tone, spelling: prefs.spelling }, await getAdapter(), controller.signal);
      const { pagesOf } = await import("@/lib/render/client");
      const compile = pagesOf({ kb: { contact: kb.contact, workRights: kb.workRights }, brief: { title: brief.title }, paper: prefs.paper, spelling: prefs.spelling });
      const themed = { resume: { ...out.resume, theme: docs.resume?.theme ?? out.resume.theme }, coverLetter: { ...out.coverLetter, theme: docs.coverLetter?.theme ?? out.coverLetter.theme } }; // keep the user's design
      const fitted = await fitDocuments(themed, { budget: prefs.quick.pages, keywords: brief.keywords, compile, signal: controller.signal });
      if (controller.signal.aborted) return;
      regenerate({ ...out, ...fitted });
      toast("Both documents regenerated");
    } catch (e) {
      if (controller.signal.aborted) return;
      setRegenerating(false);
      setError(e instanceof LlmError ? e : outputError());
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-5">
      <div>
        <h2 className="mb-[3px] text-base font-semibold tracking-[-0.015em]">{brief.title}</h2>
        <div className="text-[13px] text-muted-foreground">
          {[employer(brief.company), brief.location].filter(Boolean).join(" · ")}
        </div>
      </div>
      <section aria-label="Requirements">
        <Label>
          Requirements <Count>{`${reqs.filter((x) => x.state === "ok").length} of ${reqs.filter((x) => x.state !== "none").length} reflected`}</Count>
          <InfoTip text={`A requirement is reflected when a job keyword it mentions appears in this ${noun}. Ones without keywords have no mark.`} />
        </Label>
        <ul className="flex flex-col gap-[7px] text-[13px] text-ink-2">
          {reqs.map(({ r, state }) => (
            <li key={r} data-state={state} className={cn("grid grid-cols-[16px_1fr] items-start gap-2", state === "ok" && "text-ink")}>
              <span
                role={state === "none" ? undefined : "img"} // a label needs a role (WCAG 4.1.2)
                aria-label={state === "ok" ? "Reflected" : state === "miss" ? "Not reflected" : undefined}
                className={cn(
                  "mt-0.5 grid size-[15px] place-items-center rounded-full",
                  state === "ok" && "bg-primary text-primary-foreground",
                  state === "miss" && "border-[1.5px] border-dashed border-line-2",
                  state === "none" && "before:size-1 before:rounded-full before:bg-line-2"
                )}
              >
                {state === "ok" && <Check aria-hidden className="size-2.5" strokeWidth={3} />}
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Keywords">
        <Label>
          Keywords <Count>{`${matched.length} of ${brief.keywords.length} in this ${noun}`}</Count>
        </Label>
        <ul className="flex flex-wrap gap-1.5">
          {brief.keywords.map((k) => {
            const on = matched.includes(k);
            return (
              <li key={k}>
                <Chip aria-label={`${k}${on ? "" : ", missing"}`} className={cn("px-2 py-0.5 text-xs", on ? "border-accent-line bg-accent-soft text-accent-ink" : "border-dashed bg-surface text-muted-foreground")}>
                  {on && <Check aria-hidden className="size-[11px]" />}
                  {k}
                </Chip>
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <Label>
          <label htmlFor="ws-notes">Your notes</label>
          <InfoTip text="Used as a fact you supplied. Changes apply the next time you regenerate or rewrite." />
        </Label>
        <Textarea id="ws-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why you want this job, what to emphasise, who referred you" className="text-[13px]" />
      </section>
      <Collapsible>
        <CollapsibleTrigger>Job description</CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-[320px] overflow-auto rounded-sm border border-line bg-surface p-2.5 font-sans text-[12.5px] leading-[1.55] whitespace-pre-wrap text-ink-2">{project.jdText}</pre>
        </CollapsibleContent>
      </Collapsible>
      <div className="mt-auto flex flex-col gap-2.5 pt-1">
        {error && <LlmErrorCallout error={error} onRetry={go} />}
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="quiet" size="sm" disabled={busy} onClick={() => setOpen(true)} className="w-full justify-center">
            <Sparkles /> Regenerate both documents
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regenerate both documents?</DialogTitle>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-2.5">
              <p>{`This replaces the resume and cover letter with a fresh generation from the job brief, using about 7,500 tokens on ${model}.`}</p>
              <p className="text-muted-foreground">Your current versions stay in history, so you can restore them.</p>
              <p className="text-[13px] text-muted-foreground">For small changes, rewriting one section is quicker and cheaper.</p>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button onClick={go}>Regenerate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
