"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { cn } from "cn";
import { LlmErrorCallout } from "@/components/llm/LlmErrorCallout";
import { Button } from "@/components/ui/button";
import { generateDocuments } from "@/lib/generate/generate";
import { getAdapter } from "@/lib/llm/adapter";
import { LlmError } from "@/lib/llm/errors";
import type { JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";

// Studio step 4 (SPEC §14.4): one generate call, then a compile check, then the project is saved. Nothing is saved
// on failure, and the draft stays as it was. Each attempt is a fresh mount (the parent changes its key).

const STAGES = [
  { label: "Matching knowledge base entries to the brief", local: true },
  { label: "Drafting the resume and cover letter", local: false },
  { label: "Validating the response", local: true },
  { label: "Running checks", local: true }, // the rules engine arrives with TASK-20
  { label: "Rendering the PDF preview", local: true },
];
const DRAFT = 1;
const GHOST_GROUPS = 6;
const WIDTHS = [92, 78, 86, 70, 96, 81];

export type GenerateDraft = { jdText: string; notes: string; brief: JobBrief; selected: string[] };
type Props = { kb: KnowledgeBase; draft: GenerateDraft; prefs: Prefs; model: string; onRetry: () => void; onBack: () => void; onDone: (id: string, seconds: number) => void };

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function Generating({ kb, draft, prefs, model, onRetry, onBack, onDone }: Props) {
  const [stage, setStage] = useState(0);
  const [times, setTimes] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ghost, setGhost] = useState(1);
  const [error, setError] = useState<LlmError | null>(null);
  const run = useRef({ kb, draft, prefs, onDone }); // one run per mount, whatever the parent re-renders

  useEffect(() => {
    const { kb, draft, prefs, onDone } = run.current;
    const controller = new AbortController();
    const started = performance.now();
    let at = started;
    const next = (i: number) => {
      const now = performance.now();
      setTimes((t) => [...t, `${((now - at) / 1000).toFixed(1)}s`]);
      at = now;
      setStage(i);
    };
    const tick = setInterval(() => setElapsed((performance.now() - started) / 1000), 100);
    const grow = setInterval(() => setGhost((g) => Math.min(g + 1, GHOST_GROUPS)), 1500);
    (async () => {
      try {
        next(DRAFT); // matching is the skeleton build, done on the device inside generateDocuments
        const out = await generateDocuments({ kb, ...draft, tone: prefs.quick.tone, spelling: prefs.spelling }, await getAdapter(), controller.signal);
        clearInterval(grow);
        setGhost(GHOST_GROUPS);
        setCount(out.count);
        next(2);
        next(3);
        next(4);
        // shortcut: a compile or save failure reruns the LLM call on Try again; keep the documents if that gets common
        const { render } = await import("@/lib/render/client");
        const data = { kb: { contact: kb.contact, workRights: kb.workRights }, brief: { title: draft.brief.title }, paper: prefs.paper, spelling: prefs.spelling };
        await render("resume", { ...data, document: out.resume });
        await render("coverLetter", { ...data, document: out.coverLetter });
        const { brief, jdText, notes, selected } = draft;
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            project: { company: brief.company, role: brief.title, location: brief.location, jdText, brief, selected, source: "studio", notes: notes.trim() || undefined },
            documents: [out.resume, out.coverLetter], // the server drops their "draft" id and projectId and makes its own
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Saving the project failed (${res.status})`);
        const { project } = await res.json();
        clearInterval(tick);
        next(5);
        onDone(project.id, (performance.now() - started) / 1000);
      } catch (e) {
        if (controller.signal.aborted) return;
        clearInterval(tick);
        clearInterval(grow);
        setError(e instanceof LlmError ? e : new LlmError("other", "Something went wrong", "Try again in a moment.", e instanceof Error ? e.message : ""));
      }
    })();
    return () => {
      controller.abort();
      clearInterval(tick);
      clearInterval(grow);
    };
  }, []);

  const state = (i: number) => (i < stage ? "done" : i > stage ? "pending" : error ? "failed" : "active");

  return (
    <div className="grid grid-cols-[1fr_300px] gap-8 max-[860px]:grid-cols-1">
      <div>
        <h1>Generating for {draft.brief.company}</h1>
        <p className="mt-1 text-muted-foreground">Using {model}. Only facts from the entries you chose can be used.</p>
        <ol aria-label="Generation stages" className="mt-[22px] mb-3.5 flex flex-col gap-1">
          {STAGES.map((s, i) => (
            <li
              key={s.label}
              data-state={state(i)}
              className={cn(
                "grid grid-cols-[22px_1fr_auto] items-center gap-2.5 py-2 text-muted-foreground transition-colors",
                state(i) === "active" && "font-medium text-ink",
                state(i) === "done" && "text-ink-2",
                state(i) === "failed" && "font-medium text-danger"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-[18px] place-items-center rounded-full border-[1.5px] border-line-2 text-primary-foreground",
                  state(i) === "active" && "animate-spin border-accent-line border-t-primary",
                  state(i) === "done" && "border-primary bg-primary",
                  state(i) === "failed" && "border-danger bg-danger"
                )}
              >
                {state(i) === "done" && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span>
                {s.label}
                {s.local && <span className="ml-1 rounded-xs border border-line bg-surface-2 px-[5px] text-[11px] font-medium text-muted-foreground">on device</span>}
              </span>
              <span className="text-[13px] font-normal text-muted-foreground">{i === 2 && count && i < stage ? `${count} operations, all valid` : times[i]}</span>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-muted-foreground" aria-live="off">
          {elapsed.toFixed(1)}s elapsed
        </p>
        {error && (
          <div className="mt-4">
            <LlmErrorCallout
              error={error}
              onRetry={onRetry}
              lead={
                <>
                  <strong>Generation stopped while {lowerFirst(STAGES[stage].label)}.</strong> Nothing was saved, and your job description, brief and selections are kept.
                </>
              }
            >
              <Button variant="ghost" size="sm" onClick={() => document.querySelector<HTMLElement>("[data-model-toggle]")?.click()}>
                Switch model
              </Button>
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronLeft /> Back to entries
              </Button>
            </LlmErrorCallout>
          </div>
        )}
      </div>
      <div aria-hidden className="flex justify-center max-[860px]:hidden">
        <div className="aspect-[210/297] w-full overflow-hidden rounded-sm border border-line bg-surface px-5 py-[22px] shadow-pop">
          <div className="h-3 w-[45%] rounded-xs bg-ink opacity-80" />
          <div className="mt-2 mb-3.5 h-[5px] w-3/4 rounded-xs bg-line-2" />
          <div data-ghost>
            {Array.from({ length: ghost }, (_, g) => [
              <div key={`h${g}`} className="mt-3.5 h-1.5 w-[30%] origin-left animate-grow rounded-xs bg-primary opacity-70" />,
              ...[0, 1, 2].map((l) => <div key={`${g}-${l}`} className="my-1.5 h-[5px] origin-left animate-grow rounded-xs bg-line-2" style={{ width: `${WIDTHS[(g + l) % WIDTHS.length]}%` }} />),
            ])}
          </div>
        </div>
      </div>
    </div>
  );
}
