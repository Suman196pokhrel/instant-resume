"use client";

import { addTransitionType, startTransition, useEffect, useId, useRef, useState, ViewTransition } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { cn } from "cn";
import { EntryFields, formHasContent, readEntry, type Entry } from "@/components/kb/EntryForm";
import { BrandMark } from "@/components/shell/Brand";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { entrySummary, KB_SECTIONS, type KbSection } from "@/lib/schemas/kb-fields";
import type { OnboardingState } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";

// Manual onboarding wizard (SPEC §14.1, mock views-onboarding.js). Each step saves the whole state through
// PUT /api/onboarding and adopts the reply, so entry and highlight IDs stay stable across saves and reloads.

type StepKey = KbSection | "review";
const STEPS: { key: StepKey; title: string; blurb: string; optional?: boolean }[] = [
  { key: "contact", title: "Contact details", blurb: "How employers reach you. This goes at the top of every resume and cover letter." },
  { key: "workRights", title: "Work rights", blurb: "Australian employers often screen on this, so it can be included when relevant.", optional: true },
  { key: "roles", title: "Experience", blurb: "Add each role, newest first. Highlights are the raw material for bullets, so be specific and include numbers.", optional: true },
  { key: "volunteering", title: "Volunteer work", blurb: "Community work, mentoring and unpaid roles count too.", optional: true },
  { key: "portfolio", title: "Portfolio items", blurb: "Personal, academic or open-source work you built.", optional: true },
  { key: "education", title: "Education", blurb: "Degrees, diplomas and relevant courses.", optional: true },
  { key: "skills", title: "Skills", blurb: "Group your skills. Only skills listed here can appear on a resume.", optional: true },
  { key: "credentials", title: "Achievements and publications", blurb: "Certifications, awards, talks, papers and patents.", optional: true },
  { key: "referees", title: "Referees", blurb: "People who can speak to your work. Optional.", optional: true },
  { key: "additional", title: "Additional sections", blurb: "Keep languages, interests, summaries and any other details from your resume.", optional: true },
  { key: "review", title: "Review", blurb: "Check everything looks right, then save it to your knowledge base." },
];
const LAST = STEPS.length - 1;

type Draft = Record<string, unknown>;
const listOf = (draft: Draft, key: KbSection) => (draft[key] as Entry[] | undefined) ?? [];
const EMAIL = /^\S+@\S+\.\S+$/;

async function putState(state: OnboardingState): Promise<OnboardingState | null> {
  try {
    const res = await fetch("/api/onboarding", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export function Wizard({ initial, kbExists, sample }: { initial: OnboardingState; kbExists: boolean; sample: Partial<Record<KbSection, unknown>> | null }) {
  const [st, setSt] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0); // remounts the entry form to clear it
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(0);
  const [mode, setMode] = useState(initial.saveMode);
  const [added, setAdded] = useState<number | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const idPrefix = useId();
  const step = STEPS[st.step];
  const draft = st.draft as Draft;

  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    if (initial.step > 0) toast(`Picked up where you left off: ${STEPS[initial.step].title}`);
  }, [initial.step]);

  /** Saves the state; on success adopts the server's copy (with IDs). Moving to another step slides the card. */
  async function save(next: OnboardingState, { flash = true } = {}) {
    setBusy(true);
    const saved = await putState(next);
    setBusy(false);
    if (!saved) {
      toast("Couldn't save your progress. Try again.", { kind: "error" });
      return false;
    }
    const moved = saved.step !== st.step;
    const apply = () => {
      setSt(saved);
      setErrors({});
      if (moved) {
        setEditing(null);
        setFormKey((k) => k + 1);
      }
      if (flash) setSavedFlash((n) => n + 1);
    };
    if (moved) {
      startTransition(() => {
        addTransitionType(saved.step > st.step ? "forward" : "back");
        apply();
      });
      window.scrollTo(0, 0);
    } else apply();
    return true;
  }

  const go = (i: number, flash = false) => save({ ...st, step: i, maxStep: Math.max(st.maxStep, i) }, { flash });

  /** The draft with the open entry form saved into it, or null when that form is invalid. */
  function withEntry(key: KbSection): Draft | null {
    const { errors: found, entry } = readEntry(form.current!, key);
    setErrors(found);
    if (!entry) return null;
    const list = [...listOf(draft, key)];
    if (editing != null) list[editing] = { ...list[editing], ...entry };
    else list.push(entry);
    return { ...draft, [key]: list };
  }

  async function saveEntry() {
    const next = withEntry(step.key as KbSection);
    if (next && (await save({ ...st, draft: next }))) {
      setEditing(null);
      setFormKey((k) => k + 1);
    }
  }

  async function next() {
    if (step.key === "review") return finish();
    const key = step.key;
    let nextDraft: Draft | null = draft;
    if (KB_SECTIONS[key].single) {
      const { errors: found, entry } = readEntry(form.current!, key);
      setErrors(found);
      if (!entry) return;
      nextDraft = { ...draft, [key]: { ...entry, id: key === "contact" ? "kb-contact" : "kb-rights" } };
    } else if (formHasContent(form.current!)) {
      nextDraft = withEntry(key); // a partly filled form is saved when it's valid
      if (!nextDraft) return;
    }
    await save({ ...st, draft: nextDraft, step: st.step + 1, maxStep: Math.max(st.maxStep, st.step + 1) });
  }

  async function finish() {
    const c = (draft.contact ?? {}) as Record<string, string>;
    if (!c.name || !EMAIL.test(c.email ?? "")) {
      toast("Review your name and a valid email in Contact details before saving.", { kind: "error" });
      return go(0);
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) });
      if (!res.ok) throw new Error(String(res.status));
      setAdded((await res.json()).added);
    } catch {
      toast("Couldn't save to your knowledge base. Try again.", { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function fillSample() {
    const key = step.key as KbSection;
    if (await save({ ...st, draft: { ...draft, [key]: structuredClone(sample![key]) } }, { flash: false })) {
      setEditing(null);
      setFormKey((k) => k + 1);
      toast("Filled with sample data");
    }
  }

  if (added != null) return <Done added={added} />;

  const pct = Math.round((st.step / LAST) * 100);
  const left = LAST - st.step;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 grid grid-cols-[auto_1fr_auto] items-center gap-8 border-b border-line bg-surface-2 px-7 py-3.5 max-[900px]:grid-cols-[1fr_auto] max-[900px]:px-4 max-[900px]:py-3">
        <Link href="/dashboard" aria-label="Instant Resume home" className="flex items-center gap-[9px] text-ink no-underline max-[900px]:hidden">
          <BrandMark />
          <span className="text-[15px] font-[650] tracking-[-0.01em]">Instant Resume</span>
        </Link>
        <div role="progressbar" aria-label="Onboarding progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="w-full max-w-[520px] justify-self-center">
          <div className="mb-1.5 flex justify-between text-[12.5px] font-medium">
            <span>{`Step ${st.step + 1} of ${STEPS.length}`}</span>
            <span className="text-muted-foreground">{left ? `${left} ${left === 1 ? "step" : "steps"} left` : "Last step"}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-[3px] bg-sunken">
            <div className="h-full rounded-[3px] bg-primary [transition:width_var(--t-progress)_var(--ease-progress)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Save and exit
        </Link>
      </header>

      <div className="grid grid-cols-[240px_minmax(0,760px)] justify-center gap-10 px-7 pt-9 pb-15 max-[900px]:grid-cols-1 max-[900px]:px-4 max-[900px]:pt-5 max-[900px]:pb-10">
        <nav aria-label="Onboarding steps" className="sticky top-[100px] self-start max-[900px]:hidden">
          <ol className="flex flex-col gap-0.5">
            {STEPS.map((s, i) => {
              const done = i < st.step;
              const current = i === st.step;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    disabled={i > st.maxStep || busy}
                    aria-current={current ? "step" : undefined}
                    onClick={() => go(i)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-sm px-2 py-[7px] text-left text-[13.5px] font-medium text-muted-foreground enabled:cursor-pointer enabled:hover:bg-sunken",
                      done && "text-ink-2",
                      current && "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)]"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-[22px] flex-none place-items-center rounded-full bg-sunken text-[11.5px] font-semibold text-ink-2 transition-colors duration-(--t)",
                        done && "bg-primary text-primary-foreground",
                        current && "bg-ink text-background shadow-[0_0_0_3px_var(--surface),0_0_0_4px_var(--line-2)]"
                      )}
                    >
                      {done ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span>{s.title}</span>
                    {s.optional && <span className="ml-auto text-xs font-normal text-muted-foreground">optional</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <ViewTransition key={st.step} enter={{ forward: "onb-in-forward", back: "onb-in-back", default: "none" }} exit={{ forward: "onb-out", back: "onb-out", default: "none" }} default="none">
          <section className="rounded-lg border border-line bg-surface p-7 max-[900px]:px-4 max-[900px]:py-5">
            <div className="mb-[22px] flex items-start justify-between gap-4">
              <div>
                <h1 className="mb-1.5">{step.title}</h1>
                <p className="m-0 max-w-[520px] text-muted-foreground">{step.blurb}</p>
              </div>
              {sample && step.key !== "review" && (
                <Button variant="ghost" size="sm" onClick={fillSample} disabled={busy}>
                  <Zap className="size-3.5" /> Fill with sample
                </Button>
              )}
            </div>

            {step.key === "review" ? (
              <Review draft={draft} kbExists={kbExists} mode={mode} setMode={setMode} onEdit={(i) => go(i)} />
            ) : KB_SECTIONS[step.key].single ? (
              <form key={formKey} ref={form} noValidate onSubmit={(e) => (e.preventDefault(), next())}>
                <EntryFields section={step.key} entry={draft[step.key] as Entry | undefined} errors={errors} idPrefix={idPrefix} />
              </form>
            ) : (
              <ListStep
                section={step.key}
                entries={listOf(draft, step.key)}
                editing={editing}
                onEdit={(i) => {
                  setEditing(i);
                  setErrors({});
                  setFormKey((k) => k + 1);
                }}
                onRemove={(i) => save({ ...st, draft: { ...draft, [step.key]: listOf(draft, step.key as KbSection).filter((_, j) => j !== i) } }, { flash: false }).then(() => setEditing(null))}
              >
                <form key={formKey} ref={form} noValidate onSubmit={(e) => (e.preventDefault(), saveEntry())} className="flex flex-col gap-3.5 rounded-md border border-dashed border-line-2 p-4">
                  <strong>
                    {listOf(draft, step.key).length
                      ? editing != null
                        ? `Edit ${KB_SECTIONS[step.key].noun}`
                        : `Add another ${KB_SECTIONS[step.key].noun}`
                      : `Add your first ${KB_SECTIONS[step.key].noun}`}
                  </strong>
                  <EntryFields section={step.key} entry={editing != null ? listOf(draft, step.key)[editing] : undefined} errors={errors} idPrefix={idPrefix} />
                  <Button type="submit" variant="ghost" size="sm" className="self-start" disabled={busy}>
                    <Check className="size-3.5" /> {editing != null ? "Update" : "Save"} {KB_SECTIONS[step.key].noun}
                  </Button>
                </form>
              </ListStep>
            )}

            <footer className="mt-[26px] flex items-center justify-between gap-3 border-t border-line pt-[18px]">
              <Button variant="ghost" disabled={st.step === 0 || busy} onClick={() => go(st.step - 1)}>
                <ChevronLeft className="size-[15px]" /> Back
              </Button>
              <span role="status" className="inline-flex items-center gap-[5px] text-[13px] text-accent-ink">
                {savedFlash > 0 && (
                  <span key={savedFlash} className="inline-flex animate-saved items-center gap-[5px]">
                    <Check className="size-[13px]" /> Saved
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                {step.optional && (
                  <Button variant="ghost" disabled={busy} onClick={() => go(st.step + 1)}>
                    Skip this step
                  </Button>
                )}
                <Button onClick={next} disabled={busy}>
                  {step.key === "review" ? "Save to knowledge base" : "Save and continue"}
                </Button>
              </div>
            </footer>
          </section>
        </ViewTransition>
      </div>
    </div>
  );
}

function ListStep({
  section,
  entries,
  editing,
  onEdit,
  onRemove,
  children,
}: {
  section: KbSection;
  entries: Entry[];
  editing: number | null;
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {!!entries.length && (
        <div className="mb-[18px] flex flex-col gap-2">
          {entries.map((e, i) => {
            const s = entrySummary(section, e);
            return (
              <div key={e.id ?? i} className={cn("flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2 px-3.5 py-3", i === editing && "border-primary")}>
                <div>
                  <strong>{s.title}</strong>
                  <div className="text-[13px] text-muted-foreground">{s.sub || s.chips?.join(", ")}</div>
                  {e.highlights && <div className="text-[13px] text-muted-foreground">{`${e.highlights.length} ${e.highlights.length === 1 ? "highlight" : "highlights"}`}</div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" aria-label={`Edit ${s.title}`} onClick={() => onEdit(i)}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <Button size="icon" aria-label={`Remove ${s.title}`} onClick={() => onRemove(i)}>
                    <Trash2 className="size-[15px]" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {children}
    </>
  );
}

function Review({ draft, kbExists, mode, setMode, onEdit }: { draft: Draft; kbExists: boolean; mode: string; setMode: (m: "merge" | "replace") => void; onEdit: (i: number) => void }) {
  return (
    <>
      <div className="mb-3 flex flex-col rounded-md border border-line">
        {STEPS.slice(0, LAST).map((s, i) => {
          const key = s.key as KbSection;
          const v = draft[key] as Record<string, string> | Entry[] | undefined;
          const list = Array.isArray(v);
          const n = list ? v.length : v && (key === "contact" ? v.name || v.email : v.status) ? 1 : 0;
          const desc = list ? v.map((e) => entrySummary(key, e).title).join(", ") : key === "contact" ? [v?.name, v?.email].filter(Boolean).join(", ") : (v?.status ?? "");
          return (
            <div key={s.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-line px-3.5 py-3 not-first:border-t max-[900px]:grid-cols-[1fr_auto]">
              <div>
                <strong>{s.title}</strong>
                <div className="text-[13px] text-muted-foreground">{n ? desc : "Skipped"}</div>
              </div>
              <Pill variant={n ? "ok" : "default"}>{list ? `${n} added` : n ? "Done" : "Empty"}</Pill>
              <Button variant="ghost" size="sm" aria-label={`Edit ${s.title}`} onClick={() => onEdit(i)} className="max-[900px]:col-span-full max-[900px]:justify-self-start">
                Edit
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-[13px] text-muted-foreground">You can change any of this later from the Knowledge base screen.</p>
      {kbExists && (
        <div className="mt-5 flex flex-col gap-1.5">
          <Field id="onb-save-mode" label="Save behaviour">
            <NativeSelect value={mode} onChange={(e) => setMode(e.target.value as "merge" | "replace")}>
              <option value="merge">Add entries; keep existing contact and work rights</option>
              <option value="replace">Replace the knowledge base with this reviewed background</option>
            </NativeSelect>
          </Field>
          <p className="text-[13px] text-muted-foreground">Replacement affects the knowledge base, not saved application documents.</p>
        </div>
      )}
    </>
  );
}

function Done({ added }: { added: number }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="flex max-w-[460px] flex-col items-center gap-2 text-center">
        <svg viewBox="0 0 52 52" width="64" height="64" aria-hidden className="text-primary">
          <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="151" strokeDashoffset="151" className="animate-draw-ring" />
          <path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="40" className="animate-draw-tick" />
        </svg>
        <h1 ref={heading} tabIndex={-1} className="mt-2 outline-none">
          Your knowledge base is ready
        </h1>
        <p className="text-muted-foreground">{`${added} ${added === 1 ? "entry" : "entries"} saved. Every resume and cover letter you make will draw only on these facts.`}</p>
        <div className="mt-3.5 flex gap-2">
          <Link href="/kb/roles" className={buttonVariants({ variant: "ghost" })}>
            Review knowledge base
          </Link>
          <Link href="/new" className={buttonVariants()}>
            <Plus /> Start an application
          </Link>
        </div>
      </div>
    </main>
  );
}
