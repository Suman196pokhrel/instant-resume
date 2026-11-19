"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import type { Box } from "@/lib/render/layout";
import type { JobBrief } from "@/lib/schemas/brief";
import type { ResumeDocument } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { prefersReducedMotion } from "@/lib/motion";
import { useWorkspace } from "@/lib/stores/workspace";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChecks } from "./ChecksTab";

// Section outlines and bullet sources over the Typst SVG (SPEC §14.5 Preview), placed from the template's marks.
// The Content tab's section list is the keyboard path, so these are pointer-only and hidden from screen readers.

const at = (b: Box) => ({ top: `${b.top}%`, height: `${b.height}%`, left: `${b.left}%`, width: `${b.width}%` });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function SheetOverlay({ sections, bullets, doc, kb, brief }: { sections: Box[]; bullets: Box[]; doc: ResumeDocument; kb: KnowledgeBase; brief: JobBrief }) {
  const selected = useWorkspace((s) => s.selected);
  const select = useWorkspace((s) => s.select);
  const jump = useWorkspace((s) => s.jump);
  const busy = useWorkspace((s) => !!s.busy);
  const pending = useWorkspace((s) => (s.pending?.kind === s.kind ? s.pending : null));
  const saved = useWorkspace((s) => s.docs[s.kind]);
  const root = useRef<HTMLDivElement>(null);
  const clicked = useRef<string | null>(null); // a click in the preview selects without scrolling or flashing
  const [flash, setFlash] = useState({ id: "", n: 0 });
  const flashTo = (id: string) => setFlash((f) => ({ id, n: f.n + 1 }));

  // Selecting from the Content list or a Checks "Go to" brings the section into view and flashes it.
  const prevSelected = useRef(selected);
  useEffect(() => {
    const changed = prevSelected.current !== selected;
    prevSelected.current = selected;
    if (!selected || (!changed && !jump)) return;
    if (clicked.current === selected) clicked.current = null;
    else flashTo(selected);
  }, [selected, jump]);

  // Accepting a proposal flashes the section (SPEC §12); rejecting it doesn't.
  const prevPending = useRef(pending);
  useEffect(() => {
    const p = prevPending.current;
    prevPending.current = pending;
    const now = p && !pending && saved?.sections.find((s) => s.id === p.sectionId);
    if (now && same({ ...now, hidden: p.after.hidden }, p.after)) flashTo(p.sectionId);
  }, [pending, saved]);

  // A move in Structure: flash the section once the render with its new place arrives.
  const moved = useWorkspace((s) => s.moved);
  const waiting = useRef<string | null>(null);
  useEffect(() => {
    if (moved) waiting.current = moved.id;
  }, [moved]);
  const placedAt = sections.map((s) => `${s.id}:${s.top.toFixed(2)}`).join();
  useEffect(() => {
    const id = waiting.current;
    if (id && sections.some((s) => s.id === id)) {
      waiting.current = null;
      flashTo(id);
    }
  }, [placedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- runs when the boxes move, not on every render

  const shownIds = sections.map((s) => s.id).join();
  useEffect(() => {
    if (!flash.id) return;
    const el = root.current?.querySelector(`[data-preview-section="${flash.id}"]`);
    el?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" }); // not returned: Chrome's returns a promise
  }, [flash, shownIds]);

  const section = doc.sections.find((s) => s.id === selected);
  const ownBullets = new Map(section && "items" in section ? section.items.flatMap((it) => it.bullets ?? []).map((b) => [b.id, b.source]) : []);

  return (
    <div ref={root} aria-hidden className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto">
      {sections.map((s) => {
        const proposed = pending?.sectionId === s.id;
        return (
          <div
            key={s.id === flash.id ? `${s.id}-${flash.n}` : s.id} // a new key restarts the flash
            data-preview-section={s.id}
            data-selected={selected === s.id || undefined}
            onClick={() => {
              clicked.current = s.id;
              select(s.id);
            }}
            style={at(s)}
            className={cn(
              "absolute cursor-pointer rounded-[2px] outline-[1.5px] outline-offset-4 outline-transparent transition-[outline-color] duration-(--t) ease-(--ease) hover:outline-accent-line",
              !(busy && selected === s.id) && "mix-blend-multiply", // tints sit under the text; the white shimmer needs normal blending
              selected === s.id && "outline-2 outline-primary hover:outline-primary",
              proposed && "bg-proposed-soft outline-2 outline-proposed outline-dashed hover:outline-proposed",
              s.id === flash.id && "animate-flash"
            )}
          >
            {proposed && <span className="absolute -top-3.5 -right-1 rounded-[3px] bg-proposed px-1.5 py-px text-[10px] font-semibold text-white mix-blend-normal">Proposed</span>}
            {busy && selected === s.id && <span className="absolute -inset-1 animate-sweep shimmer opacity-60" />}
          </div>
        );
      })}
      {ownBullets.size > 0 && <BulletSources boxes={bullets.filter((b) => ownBullets.has(b.id))} own={ownBullets} kb={kb} brief={brief} />}
    </div>
  );
}

/** The selected section's bullets and the facts they came from. Only mounted with a selection, so the checks it needs
 * don't run on every keystroke otherwise. */
function BulletSources({ boxes, own, kb, brief }: { boxes: Box[]; own: Map<string, string>; kb: KnowledgeBase; brief: JobBrief }) {
  const checks = useChecks(kb, brief);
  const sources = useMemo(
    () => new Map([...kb.roles, ...(kb.volunteering ?? []), ...kb.portfolio].flatMap((o) => o.highlights.map((h) => [h.id, h.text] as const))),
    [kb]
  );
  const flagged = new Set(checks?.findings.flatMap((f) => (f.type === "grounding" && f.bulletId ? [f.bulletId] : [])));
  return boxes.map((b) => {
    const text = sources.get(own.get(b.id) ?? "");
    const ok = !!text && !flagged.has(b.id);
    const title = !text ? "No source found" : flagged.has(b.id) ? "Differs from your knowledge base" : "From your knowledge base";
    return (
      <Tooltip key={b.id}>
        <TooltipTrigger
          render={<div data-preview-bullet={b.id} />}
          style={at(b)}
          className={cn("absolute -mx-1 cursor-help rounded-[2px] mix-blend-multiply transition-colors duration-(--t-fast)", ok ? "hover:bg-accent-soft" : "hover:bg-warn-soft")}
        />
        <TooltipContent title={<span className={ok ? undefined : "text-proposed"}>{title}</span>}>
          {text ?? "This bullet doesn't trace to a fact in your knowledge base. Checks flag it."}
        </TooltipContent>
      </Tooltip>
    );
  });
}
