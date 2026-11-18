"use client";

import { useEffect, useRef, useState } from "react";
import { Layers, Palette, Pencil, Sparkles, Undo2, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import type { Revision } from "@/lib/schemas/project";
import { useWorkspace } from "@/lib/stores/workspace";
import { clockTime } from "@/lib/time";
import { KIND_LABEL } from "./Workspace";

// History drawer (SPEC §14.5; mock views-workspace.js openHistory): every saved revision of the open document,
// newest first. Selecting an older one previews it; the preview banner restores it.

const ICON: Record<Revision["kind"], typeof Pencil> = { generation: Sparkles, rewrite: Sparkles, edit: Pencil, adjustment: Palette, structure: Layers, restore: Undo2 };
const LLM = new Set<Revision["kind"]>(["generation", "rewrite"]);

export function HistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const kind = useWorkspace((s) => s.kind);
  const docId = useWorkspace((s) => s.docs[s.kind]?.id);
  const settled = useWorkspace((s) => s.save === "saved");
  const viewing = useWorkspace((s) => s.viewing);
  const view = useWorkspace((s) => s.view);
  const [revs, setRevs] = useState<Revision[]>([]);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !docId || !settled) return; // refetch once each save lands, so a new change shows as Current
    const ctl = new AbortController();
    fetch(`/api/documents/${docId}/revisions`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRevs)
      .catch(() => {});
    return () => ctl.abort();
  }, [open, docId, settled]);

  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-label="History"
      aria-hidden={!open}
      className={cn(
        "absolute top-0 right-0 bottom-0 z-30 flex w-[360px] flex-col border-l border-line bg-surface shadow-pop duration-(--t-slow) ease-(--ease) max-[900px]:fixed max-[900px]:w-full",
        open ? "visible translate-x-0 transition-[translate]" : "invisible translate-x-[105%] transition-[translate,visibility]" // visible at once on open (so focus lands), hidden after sliding out
      )}
    >
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
        <h2 className="text-base font-semibold">History</h2>
        <Button ref={close} size="icon" aria-label="Close history" onClick={onClose}>
          <X />
        </Button>
      </div>
      <p className="mb-2 px-4 text-[13px] text-muted-foreground">Every change to the {KIND_LABEL[kind].toLowerCase()} is saved here automatically. Select one to preview it.</p>
      <ol aria-label="Revisions" className="flex flex-col gap-0.5 overflow-auto px-2.5 pt-1.5 pb-4">
        {revs.map((r, i) => {
          const Icon = ICON[r.kind];
          const on = viewing?.id === r.id;
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-current={on || (!viewing && i === 0) ? "true" : undefined}
                onClick={() => view(i === 0 ? null : r)}
                className={cn(
                  "grid w-full cursor-pointer grid-cols-[28px_1fr_auto] items-center gap-2.5 rounded-md px-2 py-[9px] text-left transition-colors duration-(--t) ease-(--ease) outline-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary",
                  on && "bg-accent-soft hover:bg-accent-soft"
                )}
              >
                <span aria-hidden className={cn("grid size-7 place-items-center rounded-full", LLM.has(r.kind) ? "bg-accent-soft text-accent-ink" : "bg-sunken text-ink-2")}>
                  <Icon className="size-3.5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="line-clamp-2 text-[13px] font-medium">{r.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {clockTime(r.ts)}
                    {LLM.has(r.kind) ? ", used the LLM" : ""}
                  </span>
                </span>
                {i === 0 && <Pill>Current</Pill>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
