"use client";

import { ChevronLeft, ChevronRight, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sectionText } from "@/lib/doc/plain-text";
import type { JobBrief } from "@/lib/schemas/brief";
import type { Section } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";
import { useWorkspace } from "@/lib/stores/workspace";
import { Instruction } from "./Instruction";
import { copyText } from "./Workspace";

// Inspector, Content tab (SPEC §14.5): the section list, then the Instruction box (rewrite with AI) and Edit by hand
// for the selected section. Hand edits wait while a rewrite runs or its proposal is open, so Accept never overwrites them.

type Item = Extract<Section, { items: unknown }>["items"][number];

export function ContentInspector(props: { kb: KnowledgeBase; brief: JobBrief; prefs: Prefs; notes?: string }) {
  const doc = useWorkspace((s) => s.docs[s.kind]);
  const selected = useWorkspace((s) => s.selected);
  const select = useWorkspace((s) => s.select);
  const edit = useWorkspace((s) => s.editSection);
  const locked = useWorkspace((s) => !!s.busy || !!s.pending);
  if (!doc) return null;
  const letter = doc.kind === "coverLetter";
  const s = doc.sections.find((x) => x.id === selected);

  if (!s)
    return (
      <>
        <h3>{letter ? "Paragraphs" : "Sections"}</h3>
        <p className="mt-1 mb-3 text-[13px] text-muted-foreground">Pick one to rewrite it with AI or edit it by hand. You can also click it in the preview.</p>
        <div className="flex flex-col divide-y divide-line border-y border-line">
          {doc.sections.map((x) => (
            <button key={x.id} type="button" onClick={() => select(x.id)} className="group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-2 py-2.5 text-left">
              <span className="flex items-center gap-2 font-medium">
                {x.title}
                {x.hidden && <Pill>Hidden</Pill>}
              </span>
              <ChevronRight aria-hidden className="row-span-2 size-[15px] text-muted-foreground transition-transform duration-(--t) ease-(--ease) group-hover:translate-x-0.5" />
              <span className="truncate text-[13px] text-muted-foreground">{sectionText(x).slice(0, 80)}</span>
            </button>
          ))}
        </div>
      </>
    );

  const set = (change: (s: Section) => Section, heading = false) => edit(s.id, change, heading);
  const setItem = (k: number, change: (i: Item) => Item) => set((x) => ("items" in x ? { ...x, items: x.items.map((i, n) => (n === k ? change(i) : i)) } : x));
  const all = letter ? "All paragraphs" : "All sections";

  return (
    <>
      <div className="mb-3 flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger render={<Button size="icon" aria-label={all} onClick={() => select(null)} />}>
            <ChevronLeft />
          </TooltipTrigger>
          <TooltipContent>{all}</TooltipContent>
        </Tooltip>
        <h3 className="flex-1 truncate">{s.title}</h3>
        <Tooltip>
          <TooltipTrigger render={<Button size="icon" aria-label="Copy text" onClick={() => copyText(sectionText(s), s.title)} />}>
            <Copy />
          </TooltipTrigger>
          <TooltipContent>Copy this {letter ? "paragraph" : "section"} as plain text</TooltipContent>
        </Tooltip>
      </div>
      <Instruction key={s.id} section={s} {...props} />
      <fieldset disabled={locked} className="mt-4 flex flex-col gap-3 disabled:opacity-60">
        <legend className="sr-only">Edit by hand</legend>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Edit by hand</span>
          <span className="text-[13px] text-muted-foreground">Updates the preview as you type</span>
        </div>
        {!letter && (
          <Field id="section-heading" label="Section heading">
            <Input value={s.title} onChange={(e) => set((x) => ({ ...x, title: e.target.value }), true)} />
          </Field>
        )}
        {"text" in s ? (
          <Textarea aria-label={`${s.title} text`} value={s.text} onChange={(e) => set((x) => ({ ...x, text: e.target.value }))} className="field-sizing-content min-h-24" />
        ) : (
          s.items.map((item, k) => (
            <fieldset key={item.id} className="flex flex-col gap-2 rounded-md border border-line p-3">
              <legend className="sr-only">{item.heading}</legend>
              <Input aria-label="Heading" value={item.heading} onChange={(e) => setItem(k, (i) => ({ ...i, heading: e.target.value }))} />
              {item.sub !== undefined && <Input aria-label="Subheading" value={item.sub} onChange={(e) => setItem(k, (i) => ({ ...i, sub: e.target.value }))} />}
              {item.meta !== undefined && <Input aria-label="Details" value={item.meta} onChange={(e) => setItem(k, (i) => ({ ...i, meta: e.target.value }))} />}
              {item.line !== undefined && <Textarea aria-label={s.kind === "skills" ? "Skills" : "Line"} value={item.line} onChange={(e) => setItem(k, (i) => ({ ...i, line: e.target.value }))} className="field-sizing-content" />}
              {item.bullets?.map((b, j) => (
                <div key={b.id} className="grid grid-cols-[1fr_auto] items-start gap-1.5">
                  <Textarea aria-label={`Bullet ${j + 1}`} value={b.text} onChange={(e) => setItem(k, (i) => ({ ...i, bullets: i.bullets?.map((x) => (x.id === b.id ? { ...x, text: e.target.value } : x)) }))} className="field-sizing-content" />
                  <Button size="icon" aria-label={`Remove bullet ${j + 1}`} onClick={() => setItem(k, (i) => ({ ...i, bullets: i.bullets?.filter((x) => x.id !== b.id) }))}>
                    <X />
                  </Button>
                </div>
              ))}
            </fieldset>
          ))
        )}
      </fieldset>
    </>
  );
}
