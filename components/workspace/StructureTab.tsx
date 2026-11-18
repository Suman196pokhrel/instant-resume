"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { prefersReducedMotion } from "@/lib/motion";
import { useWorkspace } from "@/lib/stores/workspace";

// Inspector, Structure tab (SPEC §14.5, mock renderStructure): reorder by drag, Alt+Arrow or the buttons, and hide
// sections without removing them. Rows glide to their new place (view transition); no LLM call, ever.

/** Runs a reorder inside a view transition so the rows glide; reduced motion just applies it. */
function glide(update: () => void) {
  if (!document.startViewTransition || prefersReducedMotion()) return update();
  const html = document.documentElement;
  html.dataset.vt = "reorder";
  const t = document.startViewTransition(() => flushSync(update));
  t.ready.catch(() => {}); // a newer transition skipped this one; the update still ran
  void t.finished.catch(() => {}).finally(() => html.dataset.vt === "reorder" && delete html.dataset.vt);
}

export function StructureTab() {
  const sections = useWorkspace((s) => s.docs[s.kind]?.sections ?? []);
  const moveSection = useWorkspace((s) => s.moveSection);
  const toggleHidden = useWorkspace((s) => s.toggleHidden);
  const [said, setSaid] = useState("");
  const [drag, setDrag] = useState<{ id: string; over?: string; above?: boolean } | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());

  const move = (id: string, to: number, focus = false, dragged = false) => {
    const title = sections.find((s) => s.id === id)?.title;
    if (to < 0 || to >= sections.length) return;
    glide(() => {
      moveSection(id, to, dragged);
      setSaid(`${title} moved to position ${to + 1}`);
    });
    if (focus) rows.current.get(id)?.focus();
  };

  function drop(target: string, above: boolean) {
    const from = drag?.id;
    setDrag(null);
    if (!from || from === target) return;
    const rest = sections.filter((s) => s.id !== from);
    const at = rest.findIndex((s) => s.id === target) + (above ? 0 : 1);
    if (at !== sections.findIndex((s) => s.id === from)) move(from, at, false, true);
  }

  return (
    <>
      <p className="mb-3 text-[13px] text-muted-foreground">Drag to reorder, or focus a row and press Alt with the up or down arrow. Hidden sections stay in the document.</p>
      <ol aria-label="Sections" className="flex flex-col gap-1.5">
        {sections.map((s, i) => (
          <li
            key={s.id}
            ref={(el) => void (el ? rows.current.set(s.id, el) : rows.current.delete(s.id))}
            data-struct-row
            tabIndex={0}
            draggable
            aria-label={`${s.title}, position ${i + 1} of ${sections.length}${s.hidden ? ", hidden" : ""}`}
            style={{ viewTransitionName: `sr-${s.id}` }}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget || !e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
              e.preventDefault();
              move(s.id, i + (e.key === "ArrowUp" ? -1 : 1), true);
            }}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", s.id);
              setDrag({ id: s.id });
            }}
            onDragEnd={() => setDrag(null)}
            onDragOver={(e) => {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const above = e.clientY < r.top + r.height / 2;
              if (drag && (drag.over !== s.id || drag.above !== above)) setDrag({ ...drag, over: s.id, above });
            }}
            onDrop={(e) => {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              drop(s.id, e.clientY < r.top + r.height / 2);
            }}
            className={cn(
              "relative grid grid-cols-[18px_1fr_repeat(3,30px)] items-center gap-1 rounded-md border border-line bg-surface py-1.5 pr-1.5 pl-2 transition-[opacity,box-shadow,border-color] duration-(--t) ease-(--ease) outline-none [view-transition-class:struct] hover:border-line-2 focus-visible:outline-2 focus-visible:outline-primary",
              s.hidden && "border-dashed bg-surface-2",
              drag?.id === s.id && "opacity-40",
              drag?.over === s.id && drag.id !== s.id && (drag.above ? "shadow-[0_-3px_0_0_var(--primary)]" : "shadow-[0_3px_0_0_var(--primary)]")
            )}
          >
            <GripVertical aria-hidden className="size-[15px] cursor-grab text-muted-foreground" />
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <span className={cn("truncate", s.hidden && "text-muted-foreground line-through decoration-line-2")}>{s.title}</span>
              {s.hidden && <Pill>Hidden</Pill>}
            </span>
            <Button size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(s.id, i - 1)}>
              <ArrowUp />
            </Button>
            <Button size="icon" aria-label="Move down" disabled={i === sections.length - 1} onClick={() => move(s.id, i + 1)}>
              <ArrowDown />
            </Button>
            <Button size="icon" aria-label={`${s.hidden ? "Show" : "Hide"} ${s.title}`} onClick={() => glide(() => toggleHidden(s.id))}>
              {s.hidden ? <EyeOff /> : <Eye />}
            </Button>
          </li>
        ))}
      </ol>
      <div aria-live="polite" className="sr-only">
        {said}
      </div>
    </>
  );
}
