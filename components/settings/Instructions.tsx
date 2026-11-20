"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Chip } from "@/components/ui/pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { INSTRUCTION_MAX, INSTRUCTION_TARGETS, type InstructionTarget, type WritingInstruction } from "@/lib/schemas/settings";
import { newId } from "@/lib/utils";

// Settings → Writing instructions (SPEC §13.3): the user's own instructions, layered on the writing prompts.
// No PUT of its own: PrefsSettings owns the one prefs object, so saving here never overwrites another preference.

const MAX_ITEMS = 12;
const EXAMPLES: { target: InstructionTarget; text: string }[] = [
  { target: "experience", text: "Keep every bullet under 20 words and start it with a strong verb." },
  { target: "summary", text: "Open with my current job title and keep it to two sentences." },
  { target: "skills", text: "Put the tools named in the job ad first." },
  { target: "coverLetter", text: "Keep it under 250 words and sound conversational." },
];
const TARGETS = Object.entries(INSTRUCTION_TARGETS) as [InstructionTarget, string][];
const same = (a: WritingInstruction[], b: WritingInstruction[]) => JSON.stringify(a) === JSON.stringify(b);

export function WritingInstructions({ saved, onSave }: { saved: WritingInstruction[]; onSave: (list: WritingInstruction[]) => Promise<boolean> }) {
  const [list, setList] = useState(saved);
  const [busy, setBusy] = useState(false);
  const kept = list.map((i) => ({ ...i, text: i.text.trim() })).filter((i) => i.text);
  const dirty = !same(kept, saved) || kept.length !== list.length;

  const add = (target: InstructionTarget = "resume", text = "") => setList((l) => [...l, { id: newId("ins"), target, text }]);
  const edit = (id: string, patch: Partial<WritingInstruction>) => setList((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  async function save() {
    setBusy(true);
    if (await onSave(kept)) setList(kept); // blank rows go on save
    setBusy(false);
  }

  return (
    <section className="mb-[34px]">
      <h2 className="mb-1">Writing instructions</h2>
      <p className="mb-3.5 text-muted-foreground">Your own instructions, added on top of the built-in prompts whenever a resume or cover letter is written or rewritten. They can change wording, emphasis and length, never the facts.</p>
      <div className="rounded-lg border border-line bg-surface">
        {list.length ? (
          <ul className="divide-y divide-line" aria-label="Your instructions">
            {list.map((i, n) => (
              <li key={i.id} className="grid grid-cols-[170px_1fr_auto] items-start gap-2.5 px-4 py-3.5 max-[700px]:grid-cols-[1fr_auto]">
                <NativeSelect aria-label={`Instruction ${n + 1} applies to`} value={i.target} onChange={(e) => edit(i.id, { target: e.target.value as InstructionTarget })}>
                  {TARGETS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
                <div className="max-[700px]:col-span-2 max-[700px]:row-start-2">
                  <Textarea aria-label={`Instruction ${n + 1}`} rows={2} maxLength={INSTRUCTION_MAX} placeholder="For example: keep every bullet under 20 words." value={i.text} onChange={(e) => edit(i.id, { text: e.target.value })} />
                  {i.text.length > INSTRUCTION_MAX - 100 && <span className="text-[12px] text-muted-foreground">{`${i.text.length} / ${INSTRUCTION_MAX}`}</span>}
                </div>
                <Tooltip>
                  <TooltipTrigger render={<Button size="icon" aria-label={`Remove instruction ${n + 1}`} onClick={() => setList((l) => l.filter((x) => x.id !== i.id))} />}>
                    <X />
                  </TooltipTrigger>
                  <TooltipContent>Remove</TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-2.5 px-4 py-4">
            <span className="text-muted-foreground">No instructions yet. Start from an example or write your own.</span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((x) => (
                <button key={x.text} type="button" onClick={() => add(x.target, x.text)} className="group cursor-pointer rounded-full text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <Chip className="whitespace-normal transition-colors duration-(--t) ease-(--ease) group-hover:border-primary group-hover:text-accent-ink">
                    <strong className="font-semibold">{INSTRUCTION_TARGETS[x.target]}:</strong> {x.text}
                  </Chip>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => add()} disabled={list.length >= MAX_ITEMS}>
            <Plus /> Add instruction
          </Button>
          <div className="flex gap-2">
            {dirty && (
              <Button variant="quiet" size="sm" onClick={() => setList(saved)} disabled={busy}>
                Discard
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={!dirty || busy}>
              Save instructions
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Settings → Built-in prompts: what the app sends for each call, read-only. Rendered from the server's own constants. */
export function CorePrompts({ prompts }: { prompts: { name: string; use: string; text: string }[] }) {
  return (
    <section className="mb-[34px]">
      <h2 className="mb-1">Built-in prompts</h2>
      <p className="mb-3.5 text-muted-foreground">The instructions sent to your model at each step. They keep every resume factual, so they can&apos;t be edited; your writing instructions above are added to Writing and Rewrite.</p>
      <div className="divide-y divide-line rounded-lg border border-line bg-surface">
        {prompts.map((p) => (
          <Collapsible key={p.name} className="px-4 py-3">
            <CollapsibleTrigger className="w-full text-sm">
              <span className="text-ink">{p.name}</span>
              <span className="font-normal text-muted-foreground">{`· ${p.use}`}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre tabIndex={0} aria-label={`${p.name} prompt`} className="mt-2.5 max-h-80 overflow-auto rounded-md border border-line bg-sunken p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap [font-variant-ligatures:none] text-ink-2">
                {p.text}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}
