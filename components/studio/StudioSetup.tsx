"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, KeyRound, ShieldCheck, Sparkles, X } from "lucide-react";
import { z } from "zod";
import { cn } from "cn";
import { LlmErrorCallout } from "@/components/llm/LlmErrorCallout";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Chip, Count, Pill } from "@/components/ui/pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { extractBrief } from "@/lib/brief/extract";
import { getAdapter } from "@/lib/llm/adapter";
import { LlmError } from "@/lib/llm/errors";
import { useLlmChoice } from "@/lib/llm/use-choice";
import { coverage, entryText, kbText, kwMatch, matchedKeywords, suggestSelection } from "@/lib/match/keywords";
import { briefSchema, type JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";
import { Generating } from "./Generating";

// Studio setup (SPEC §14.4, mock studioSetupView). One LLM call (the brief); suggestions and coverage are computed here.

const draftSchema = z.object({
  stage: z.enum(["jd", "brief", "select"]),
  jdText: z.string(),
  notes: z.string(),
  brief: briefSchema.nullable(),
  selected: z.array(z.string()),
});
type Draft = z.infer<typeof draftSchema>;
const EMPTY: Draft = { stage: "jd", jdText: "", notes: "", brief: null, selected: [] };

// The draft is per device, like the active model: it survives navigation and reloads. Generation saves it with the
// project, then clears it. Step 4 is not part of the draft, so a reload mid-run lands back on step 3.
export const STUDIO_DRAFT = "instant-resume-studio-draft";
function loadDraft(): Draft {
  try {
    return draftSchema.parse(JSON.parse(localStorage.getItem(STUDIO_DRAFT) ?? "null"));
  } catch {
    return EMPTY;
  }
}
function saveDraft(d: Draft) {
  try {
    localStorage.setItem(STUDIO_DRAFT, JSON.stringify(d));
  } catch {
    // storage blocked: the draft lasts until reload
  }
}

const STEPS = ["Job description", "Job brief", "Choose entries", "Generate"];
const noop = () => () => {};

export function StudioSetup({ kb, prefs }: { kb: KnowledgeBase; prefs: Prefs }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0); // step 4: 0 = not generating; each Try again is a new run
  const { connections, active } = useLlmChoice();
  const hydrated = useSyncExternalStore(noop, () => true, () => false); // the draft lives in this browser: read it after hydration
  const [edited, setD] = useState<Draft | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [llmError, setLlmError] = useState<LlmError | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const d = edited ?? (hydrated ? loadDraft() : null);
  if (!d) return null;
  const update = (patch: Partial<Draft>) => {
    const next = { ...d, ...patch };
    saveDraft(next);
    setD(next);
  };
  const step = attempt ? 3 : extracting ? 1 : { jd: 0, brief: 1, select: 2 }[d.stage];

  async function extract() {
    if (d!.jdText.trim().length < 80) return setError("That looks too short to be a full job description. Paste the whole ad, including requirements.");
    setError("");
    setLlmError(null);
    setExtracting(true);
    const controller = (abort.current = new AbortController());
    try {
      const brief = await extractBrief(d!.jdText, await getAdapter(), controller.signal);
      update({ brief, selected: suggestSelection(kb, brief.keywords), stage: "brief" });
    } catch (e) {
      if (!controller.signal.aborted) setLlmError(e instanceof LlmError ? e : new LlmError("other", "Something went wrong", "Try again in a moment."));
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="max-w-[860px]">
      <ol className="mb-5 flex flex-wrap items-center gap-2.5" aria-label="Studio steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 text-[13px] font-medium text-muted-foreground",
              i === step && "font-semibold text-ink",
              i < step && "text-accent-ink",
              i < STEPS.length - 1 && "after:ml-0.5 after:h-[1.5px] after:w-8 after:rounded-sm after:bg-line-2 after:content-['']",
              i < step && "after:bg-accent-line"
            )}
          >
            <span className={cn("grid size-[22px] place-items-center rounded-full border border-line-2 text-xs", i === step && "border-ink bg-ink text-on-ink", i < step && "border-accent-line bg-accent-soft")}>
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <section className="rounded-lg border border-line bg-surface p-6">
        {attempt && d.brief ? (
          <Generating
            key={attempt}
            kb={kb}
            draft={{ jdText: d.jdText, notes: d.notes, brief: d.brief, selected: d.selected }}
            prefs={prefs}
            model={active?.model ?? ""}
            onRetry={() => setAttempt((a) => a + 1)}
            onBack={() => setAttempt(0)}
            onDone={(id, seconds) => {
              try {
                localStorage.removeItem(STUDIO_DRAFT);
              } catch {
                // storage blocked: nothing was kept
              }
              router.push(`/projects/${id}`);
              toast(`Generated in ${seconds.toFixed(1)}s. Review the checks before you export.`); // "No issues found." arrives with the checks (TASK-20)
            }}
          />
        ) : extracting ? (
          <Extracting model={active?.model ?? ""} />
        ) : d.stage === "jd" ? (
          <JdStep d={d} update={update} connected={!!active} loading={connections === null} model={active?.model} error={error} llmError={llmError} onExtract={extract} />
        ) : d.stage === "brief" && d.brief ? (
          <BriefStep kb={kb} brief={d.brief} model={active?.model} onChange={(brief) => update({ brief })} onBack={() => update({ stage: "jd" })} onNext={() => update({ stage: "select" })} />
        ) : d.brief ? (
          <SelectStep kb={kb} brief={d.brief} selected={d.selected} model={active?.model} onChange={(selected) => update({ selected })} onBack={() => update({ stage: "brief" })} onGenerate={() => setAttempt(1)} />
        ) : null}
      </section>
    </div>
  );
}

function Extracting({ model }: { model: string }) {
  const bar = "rounded-sm bg-sunken";
  return (
    <div aria-busy="true">
      <p role="status" className="mb-4 text-ink-2">
        Reading the job description with {model}…
      </p>
      <div className={cn(bar, "mb-2 h-6 w-1/2")} />
      <div className={cn(bar, "mb-5 h-3 w-3/5")} />
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          {[40, 100, 100, 100, 100].map((w, i) => (
            <div key={i} className={cn(bar, "h-3")} style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={cn(bar, "h-6 w-16 rounded-full")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function JdStep(props: {
  d: Draft;
  update: (p: Partial<Draft>) => void;
  connected: boolean;
  loading: boolean;
  model?: string;
  error: string;
  llmError: LlmError | null;
  onExtract: () => void;
}) {
  const { d, update, connected, loading, error, llmError, onExtract } = props;
  return (
    <>
      <h1>Paste the job description</h1>
      <p className="mt-1 mb-4 text-muted-foreground">Paste the whole ad as plain text. You&apos;ll see what was extracted before anything is generated.</p>
      {!connected && !loading && (
        <Callout variant="warn" className="mb-4">
          <KeyRound />
          <div>
            <strong>No API key connected.</strong> Extraction and generation run on your own provider account. <Link href="/settings">Add a key in Settings</Link>
          </div>
        </Callout>
      )}
      <Field id="jd-text" label="Job description" error={error}>
        <Textarea
          rows={14}
          value={d.jdText}
          onChange={(e) => update({ jdText: e.target.value })}
          placeholder={"Senior Frontend Engineer\nCompany, Sydney NSW\n\nWhat you'll do…"}
        />
      </Field>
      <Collapsible defaultOpen={!!d.notes} className="mt-3">
        <CollapsibleTrigger className="text-sm font-medium text-ink">
          Notes for this application <span className="font-normal text-muted-foreground">optional</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Field id="studio-notes" label="Notes for this application" className="mt-2 [&_label]:sr-only">
            <Textarea rows={2} value={d.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Why you want this job, what to emphasise, who referred you" />
          </Field>
          <p className="mt-1 text-[13px] text-muted-foreground">Used as a fact you supplied, mostly in the cover letter. Nothing else is added.</p>
        </CollapsibleContent>
      </Collapsible>
      {llmError && (
        <div className="mt-4">
          <LlmErrorCallout error={llmError} onRetry={onExtract} />
        </div>
      )}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-[13px] text-muted-foreground">{d.jdText.length.toLocaleString()} characters</span>
        <Button onClick={onExtract} disabled={!connected || !d.jdText.trim()}>
          <Sparkles /> Extract requirements
        </Button>
      </div>
    </>
  );
}

function BriefStep({ kb, brief, model, onChange, onBack, onNext }: { kb: KnowledgeBase; brief: JobBrief; model?: string; onChange: (b: JobBrief) => void; onBack: () => void; onNext: () => void }) {
  const [newKw, setNewKw] = useState("");
  const text = useMemo(() => kbText(kb), [kb]);
  const set = (k: "title" | "company" | "location" | "team") => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...brief, [k]: e.target.value });
  const add = () => {
    const k = newKw.trim();
    if (k && !brief.keywords.includes(k)) onChange({ ...brief, keywords: [...brief.keywords, k] });
    setNewKw("");
  };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Job brief</h1>
          <p className="mt-1 text-muted-foreground">Extracted from the ad. Fix anything that&apos;s wrong; keywords drive tailoring and checks.</p>
        </div>
        {model && (
          <Pill>
            <Sparkles className="size-3" /> Extracted by {model}
          </Pill>
        )}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3 max-[900px]:grid-cols-1">
        <Field id="b-title" label="Role">
          <Input value={brief.title} onChange={set("title")} />
        </Field>
        <Field id="b-company" label="Company">
          <Input value={brief.company} onChange={set("company")} />
        </Field>
        <Field id="b-location" label="Location">
          <Input value={brief.location} onChange={set("location")} />
        </Field>
        <Field id="b-team" label="Team" optional>
          <Input value={brief.team ?? ""} onChange={set("team")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
        <div>
          <h3 className="mb-2 flex items-center gap-1.5">
            Requirements <Count>{brief.requirements.length}</Count>
          </h3>
          <ul className="mb-4 list-disc pl-5 text-ink-2">
            {brief.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {brief.niceToHave.length > 0 && (
            <>
              <h3 className="mb-2 flex items-center gap-1.5">
                Nice to have <Count>{brief.niceToHave.length}</Count>
              </h3>
              <ul className="mb-4 list-disc pl-5 text-muted-foreground">
                {brief.niceToHave.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}
          {brief.workRights && brief.workRights !== "Not stated" && (
            <Callout>
              <ShieldCheck />
              <div>
                <strong>{brief.workRights.replace(/\.$/, "")}.</strong> Your knowledge base says: {kb.workRights?.status ?? "not recorded"}.
              </div>
            </Callout>
          )}
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5">
            Keywords <Count>{brief.keywords.length}</Count>
          </h3>
          <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-full border border-accent-line bg-accent-soft" /> Backed by your knowledge base
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-full border border-dashed border-line-2" /> Not backed, so it can&apos;t be claimed
            </span>
          </div>
          <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Keywords">
            {brief.keywords.map((k) => {
              const backed = kwMatch(text, k);
              return (
                <li key={k}>
                  <Chip data-backed={backed} className={backed ? "border-accent-line bg-accent-soft text-accent-ink" : "border-dashed bg-surface text-muted-foreground"}>
                    {backed && <Check className="size-3" />}
                    {k}
                    <span className="sr-only">{backed ? " (backed by your knowledge base)" : " (not backed)"}</span>
                    <button type="button" aria-label={`Remove ${k}`} className="-mr-1 grid size-4 place-items-center rounded-full hover:bg-sunken" onClick={() => onChange({ ...brief, keywords: brief.keywords.filter((x) => x !== k) })}>
                      <X className="size-3" />
                    </button>
                  </Chip>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2">
            <Input aria-label="Add a keyword" placeholder="Add a keyword" value={newKw} onChange={(e) => setNewKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button variant="ghost" size="sm" onClick={add}>
              Add
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft /> Edit job description
        </Button>
        <Button onClick={onNext}>
          Choose entries <ChevronRight />
        </Button>
      </div>
    </>
  );
}

type Row = { id: string; label: string; text: string };

function SelectStep(props: { kb: KnowledgeBase; brief: JobBrief; selected: string[]; model?: string; onChange: (s: string[]) => void; onBack: () => void; onGenerate: () => void }) {
  const { kb, brief, selected, model, onChange, onBack, onGenerate } = props;
  const [error, setError] = useState("");
  const suggested = useMemo(() => new Set(suggestSelection(kb, brief.keywords)), [kb, brief.keywords]);
  const row = (id: string, label: string, e: Record<string, unknown>): Row => ({ id, label, text: entryText(e) });
  const groups: [string, Row[]][] = (
    [
      ["Experience", [...kb.roles, ...(kb.volunteering ?? [])].map((r) => row(r.id, `${r.title}, ${r.company}`, r))],
      ["Portfolio", kb.portfolio.map((p) => row(p.id, p.name, p))],
      ["Education", kb.education.map((e) => row(e.id, `${e.degree}, ${e.institution}`, e))],
      ["Certifications and awards", kb.credentials.map((c) => row(c.id, c.title, c))],
      ["Referees", kb.referees.map((r) => row(r.id, r.name, r))],
      ["Additional sections", (kb.additional ?? []).filter((a) => !a.referenceOnly).map((a) => row(a.id, a.title, a))],
    ] as [string, Row[]][]
  ).filter(([, rows]) => rows.length);
  const total = groups.reduce((n, [, rows]) => n + rows.length, 0);
  const { covered, total: kwTotal } = coverage(kb, brief.keywords, selected);
  const toggle = (id: string, on: boolean) => {
    setError("");
    onChange(on ? [...selected, id] : selected.filter((x) => x !== id));
  };

  return (
    <>
      <h1>Choose what to draw on</h1>
      <p className="mt-1 mb-3 text-muted-foreground">Suggestions are based on keyword matches. Only ticked entries can appear in the documents.</p>
      <div className="mb-4 flex flex-wrap gap-2" aria-live="polite">
        <Pill variant={covered < kwTotal / 2 ? "warn" : "ok"}>
          Covers {covered} of {kwTotal} keywords
        </Pill>
        <Pill>
          {selected.length} of {total} selected
        </Pill>
      </div>
      {groups.map(([title, rows]) => (
        <fieldset key={title} className="mb-4">
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">{title}</legend>
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {rows.map((r) => {
              const m = matchedKeywords(r.text, brief.keywords);
              return (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Checkbox id={`pick-${r.id}`} checked={selected.includes(r.id)} onCheckedChange={(on) => toggle(r.id, on)} />
                  <label htmlFor={`pick-${r.id}`} className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-ink">
                      {r.label}
                      {suggested.has(r.id) && <span className="ml-1.5 text-xs font-normal text-accent-ink">• Suggested</span>}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">{m.length ? `Matches ${m.slice(0, 5).join(", ")}` : "No keyword matches"}</span>
                  </label>
                  {m.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger render={<span className="h-1.5 w-16 flex-none overflow-hidden rounded-full bg-sunken" tabIndex={0} aria-label={`Matches ${m.length} of ${kwTotal} job keywords`} />}>
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((m.length / kwTotal) * 100)}%` }} />
                      </TooltipTrigger>
                      <TooltipContent>
                        Matches {m.length} of {kwTotal} job keywords
                      </TooltipContent>
                    </Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-6 -mb-6 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-b-lg border-t border-line bg-surface px-6 py-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft /> Back to brief
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground">{model ? `Runs on ${model}, about 7,500 tokens` : "Connect a provider in Settings to generate"}</span>
          <Button disabled={!model} onClick={() => (selected.length ? onGenerate() : setError("Select at least one knowledge base entry"))}>
            <Sparkles /> Generate resume and cover letter
          </Button>
        </div>
      </div>
    </>
  );
}
