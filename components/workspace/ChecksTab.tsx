"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Plus, Sparkles, TriangleAlert, Zap } from "lucide-react";
import { cn } from "cn";
import { AddEvidenceDialog } from "@/components/kb/AddEvidenceDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Chip } from "@/components/ui/pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { runChecks, type Finding } from "@/lib/checks/run";
import type { JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { useWorkspace } from "@/lib/stores/workspace";
import { AddMissingDialog } from "./AddMissingDialog";

// Job panel, Checks tab (SPEC §10, §14.5; mock views-workspace.js renderLeft 'checks'): the rules engine on this
// device, no LLM call. Findings jump to their section.

const CHECK_DELAY = 250; // SPEC §10: checks run after every change, debounced

function useDebounced<T>(value: T, ms: number) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return shown;
}

/** The active document's checks, re-run 250 ms after the last change (switching documents shows the other at once). */
export function useChecks(kb: KnowledgeBase, brief: JobBrief) {
  const doc = useWorkspace((s) => s.docs[s.kind]);
  const notes = useWorkspace((s) => s.notes);
  const lateDoc = useDebounced(doc, CHECK_DELAY); // each value on its own, so a re-render never restarts the wait
  const lateNotes = useDebounced(notes, CHECK_DELAY);
  const shown = lateDoc?.kind === doc?.kind ? lateDoc : doc;
  return useMemo(() => (shown ? runChecks(shown, brief, kb, lateNotes) : null), [shown, lateNotes, brief, kb]);
}

function Ring({ pct }: { pct: number }) {
  const c = +(2 * Math.PI * 15).toFixed(2);
  return (
    <svg viewBox="0 0 36 36" width="44" height="44" aria-hidden className="-rotate-90" style={{ "--c": c } as React.CSSProperties}>
      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-sunken" />
      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={(c * (1 - pct / 100)).toFixed(2)} className="animate-ring-in stroke-primary" />
    </svg>
  );
}

function Tip({ text, children }: { text: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2">{children}</div>;
const OkRow = ({ children }: { children: React.ReactNode }) => (
  <div className="-mt-2 flex items-center gap-[7px] text-[13px] text-ink-2">
    <Check aria-hidden className="size-[13px] text-ok" /> {children}
  </div>
);
const linkBtn = "inline-flex cursor-pointer items-center gap-1 rounded-sm text-[12.5px] font-medium text-accent-ink outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function ChecksTab({ kb, brief, spelling }: { kb: KnowledgeBase; brief: JobBrief; spelling: "en-AU" | "en-US" }) {
  const router = useRouter();
  const kind = useWorkspace((s) => s.kind);
  const sections = useWorkspace((s) => s.docs[s.kind]?.sections ?? []);
  const goTo = useWorkspace((s) => s.goTo);
  const ch = useChecks(kb, brief);
  const [adding, setAdding] = useState({ keyword: "", open: false }); // kept after closing, so the dialog can animate out
  const [addingAll, setAddingAll] = useState({ n: 0, open: false }); // n: a fresh dialog each opening
  if (!ch) return null;

  const noun = kind === "resume" ? "resume" : "cover letter";
  const n = ch.findings.length;
  const total = brief.keywords.length;
  const pct = Math.round((ch.matched.length / Math.max(1, total)) * 100);
  const notInKb = ch.missing.filter((m) => !m.inKb).map((m) => m.keyword);
  const parseOk = ch.parse.filter((p) => p.ok).length;
  const titleOf = (id: string) => sections.find((s) => s.id === id)?.title ?? "section";
  const emphasise = (kw: string) => {
    const target = sections.find((s) => s.kind === "experience") ?? sections[0];
    if (target) goTo(target.id, `Emphasise ${kw}`);
  };
  const group = (type: Finding["type"], label: string, clean: string) => {
    const fs = ch.findings.filter((f) => f.type === type);
    if (!fs.length) return <OkRow>{clean}</OkRow>;
    return (
      <section aria-label={label}>
        <Label>
          {label} <span className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-warn-soft px-[5px] text-[11px] font-semibold text-warn">{fs.length}</span>
        </Label>
        <div className="flex flex-col gap-1.5">
          {fs.map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(f.sectionId)}
              className={cn(
                "group flex w-full cursor-pointer flex-col gap-[3px] rounded-md border px-[11px] py-2.5 text-left transition-[box-shadow,scale] duration-(--t) ease-(--ease) outline-none hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99]",
                type === "banned" ? "border-danger-line bg-danger-soft" : "border-warn-line bg-warn-soft"
              )}
            >
              <span className="flex items-start gap-1.5 text-[13px] font-semibold">
                <TriangleAlert aria-hidden className={cn("mt-0.5 size-[13px] shrink-0", type === "banned" ? "text-danger" : "text-warn")} />
                {f.title}
              </span>
              <span className="text-[12.5px] text-ink-2">{f.detail}</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-ink">
                Go to {titleOf(f.sectionId)}
                <ArrowRight aria-hidden className="size-3 transition-transform duration-(--t-spring) ease-(--spring) group-hover:translate-x-[3px]" />
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="flex min-h-full flex-col gap-5">
      <div role="status" className={cn("flex items-start gap-2.5 rounded-lg p-3 text-[13px]", n ? "bg-warn-soft shadow-[inset_0_0_0_1px_var(--warn-line)]" : "bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)]")}>
        {n ? <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" /> : <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />}
        <div className="flex flex-col gap-px">
          <strong className="text-sm">{n ? `${n} ${n === 1 ? "thing" : "things"} to review` : "Nothing to fix"}</strong>
          <span className="text-ink-2">{n ? "Select one to jump to it. You can still export." : `This ${noun} is ready to export.`}</span>
        </div>
      </div>
      <section aria-label="Job keyword match">
        <Label>Job keyword match</Label>
        <div className="flex items-center gap-3">
          <Ring pct={pct} />
          <div className="flex flex-col">
            <strong className="text-[15px] tabular-nums">{`${ch.matched.length} of ${total}`}</strong>
            <span className="text-[13px] text-muted-foreground">keywords appear in this {noun}</span>
          </div>
        </div>
        {ch.missing.length ? (
          <ul aria-label="Missing keywords" className="mt-2.5 flex flex-col gap-1.5">
            {ch.missing.map((m) => (
              <li key={m.keyword} className="flex items-center justify-between gap-2">
                <Chip className="border-dashed bg-surface text-muted-foreground">{m.keyword}</Chip>
                {m.inKb ? (
                  <Tip text="It's in your knowledge base. Ask for a rewrite that brings it forward.">
                    <button type="button" aria-label={`Emphasise ${m.keyword}`} onClick={() => emphasise(m.keyword)} className={linkBtn}>
                      <Sparkles aria-hidden className="size-3" /> Emphasise
                    </button>
                  </Tip>
                ) : (
                  <Tip text="Not in your knowledge base yet. Add what you did, then it can be claimed.">
                    <button type="button" aria-label={`Add ${m.keyword}`} onClick={() => setAdding({ keyword: m.keyword, open: true })} className={linkBtn}>
                      <Plus aria-hidden className="size-3" /> Add it
                    </button>
                  </Tip>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2.5 text-[13px] text-ok">Every keyword from the job brief appears.</p>
        )}
        {notInKb.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setAddingAll((a) => ({ n: a.n + 1, open: true }))} className="mt-3 w-full">
            <Sparkles aria-hidden /> Add what&apos;s missing
          </Button>
        )}
      </section>
      {group("grounding", "Claims not found in your knowledge base", "Every claim traces to your knowledge base")}
      {group("banned", "Banned phrases", "No banned phrases")}
      <Collapsible defaultOpen={parseOk < ch.parse.length}>
        <CollapsibleTrigger className="w-full">
          Parse safety <span className="ml-auto font-medium text-muted-foreground tabular-nums">{`${parseOk} of ${ch.parse.length} pass`}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 mb-2 flex flex-col gap-[5px] text-[13px]">
            {ch.parse.map((p) => (
              <li key={p.label} className="flex flex-wrap items-start gap-[7px]">
                {p.ok ? <Check aria-label="Passes" className="mt-[3px] size-[13px] text-ok" /> : <TriangleAlert aria-label="Fails" className="mt-[3px] size-[13px] text-warn" />}
                {p.label}
                {!p.ok && p.hint && <div className="w-full pl-5 text-xs text-muted-foreground">{p.hint}</div>}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">There&apos;s no universal &quot;ATS score&quot;. These checks cover whether job sites can read the file; keyword match is shown above, separately.</p>
        </CollapsibleContent>
      </Collapsible>
      <p className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <Zap aria-hidden className="size-3 text-primary" /> Checks run on this device after every change. No LLM call.
      </p>
      <AddEvidenceDialog kb={kb} requirement={adding.keyword} keyword={adding.keyword} keywords={brief.keywords} open={adding.open} onOpenChange={(open) => setAdding((a) => ({ ...a, open }))} onSaved={() => router.refresh()} />
      <AddMissingDialog key={addingAll.n} kb={kb} brief={brief} keywords={notInKb} spelling={spelling} open={addingAll.open} onOpenChange={(open) => setAddingAll((a) => ({ ...a, open }))} onSaved={() => router.refresh()} />
    </div>
  );
}
