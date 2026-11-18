"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";
import { Zap } from "lucide-react";
import { useWorkspace } from "@/lib/stores/workspace";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// The live preview (SPEC §9.1, §14.5): Typst pages as SVG, re-rendered on every change (typing debounced 120 ms;
// the newest render wins), zoomable from 40% to 160%, Fit to width by default.

const DEBOUNCE = 120;
const SHEET_PX = 794; // 210 mm at 96 dpi
const clampZoom = (z: number) => Math.min(1.6, Math.max(0.4, +z.toFixed(2)));

export function Preview({ kb, brief, prefs }: { kb: KnowledgeBase; brief: JobBrief; prefs: Prefs }) {
  const kind = useWorkspace((s) => s.kind);
  const saved = useWorkspace((s) => s.docs[s.kind]);
  const pending = useWorkspace((s) => (s.pending?.kind === s.kind ? s.pending : null));
  const doc = useMemo(() => saved && pending ? { ...saved, sections: saved.sections.map((x) => (x.id === pending.sectionId ? pending.after : x)) } : saved, [saved, pending]); // a proposal shows before it is accepted
  const zoom = useWorkspace((s) => s.zoom);
  const setZoom = useWorkspace((s) => s.setZoom);
  const setRenderMs = useWorkspace((s) => s.setRenderMs);
  const [out, setOut] = useState<{ svg: string; ms: number; pages: number; design: boolean } | null>(null);
  const shown = useRef(doc); // the last document sent, to tell a design-only change from an edit
  const [error, setError] = useState("");
  const [fit, setFit] = useState(1);
  const latest = useRef(0);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc) return;
    const n = ++latest.current;
    const design = !!shown.current && shown.current !== doc && shown.current.sections === doc.sections && shown.current.theme !== doc.theme;
    shown.current = doc;
    const t = setTimeout(async () => {
      try {
        const { render } = await import("@/lib/render/client");
        const r = await render(kind, { document: doc, kb: { contact: kb.contact, workRights: kb.workRights }, brief: { title: brief.title }, paper: prefs.paper, spelling: prefs.spelling }, "svg");
        if (n !== latest.current) return; // a newer change is already rendering
        setOut({ svg: r.svg ?? "", ms: r.ms, pages: r.pages, design });
        setRenderMs(r.ms);
        setError("");
      } catch (e) {
        if (n === latest.current) setError(e instanceof Error ? e.message : String(e));
      }
    }, design ? 0 : DEBOUNCE); // design changes render at once (SPEC §9.1); typing is debounced
    return () => clearTimeout(t);
  }, [doc, kind, kb, brief.title, prefs.paper, prefs.spelling, setRenderMs]);

  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setFit(Math.max(0.4, Math.min(1.25, (el.clientWidth - 48) / SHEET_PX))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const z = zoom ?? fit;
  const step = (d: number) => setZoom(clampZoom(z + d));
  const icon = (label: string, onClick: () => void, children: React.ReactNode) => (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon" aria-label={label} onClick={onClick} />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <section aria-label="Preview" className="relative flex min-h-0 min-w-0 flex-col bg-sunken">
      <div className="flex items-center gap-2.5 border-b border-line bg-background px-3 py-2">
        <div className="inline-flex items-center rounded-sm border border-line bg-surface">
          {icon("Zoom out", () => step(-0.1), "−")}
          <Tooltip>
            <TooltipTrigger render={<button type="button" aria-label="Fit to width" onClick={() => setZoom(null)} className="min-w-[70px] cursor-pointer text-[12.5px] font-medium text-ink-2" />}>
              {Math.round(z * 100)}%{zoom === null ? " fit" : ""}
            </TooltipTrigger>
            <TooltipContent>Fit to width</TooltipContent>
          </Tooltip>
          {icon("Zoom in", () => step(0.1), "+")}
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-[13px] whitespace-nowrap text-muted-foreground">
          {out?.design && !error && <Zap aria-hidden className="size-3 text-primary" />}
          {error ? "Couldn't render this document" : out ? `Rendered in ${out.ms} ms · ${out.pages} ${out.pages === 1 ? "page" : "pages"} · ${prefs.paper}` : ""}
        </span>
      </div>
      <div ref={scroll} className="relative min-h-0 flex-1 overflow-auto p-6">
        {out ? (
          <div style={{ zoom: z }} className="mx-auto w-fit">
            <div data-sheet className="w-[210mm] bg-surface shadow-pop [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: out.svg }} />
          </div>
        ) : (
          !error && (
            <div className="absolute inset-0 grid place-items-center">
              <div role="status" className="flex w-[280px] flex-col gap-1.5 rounded-lg border border-line bg-surface p-4">
                <strong>Loading the Typst renderer</strong>
                <span className="text-[13px] text-muted-foreground">11 MB, loaded once per session</span>
              </div>
            </div>
          )
        )}
        {error && <p className="text-danger">{error}</p>}
      </div>
    </section>
  );
}
