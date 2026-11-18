"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Copy, Loader2, TriangleAlert, Undo2 } from "lucide-react";
import { ModelPicker } from "@/components/shell/ModelPicker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProjectBundle } from "@/lib/db/projects";
import { plainText } from "@/lib/doc/plain-text";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";
import { createWorkspaceStore, useWorkspace, WorkspaceContext, type InspectorTab, type Kind } from "@/lib/stores/workspace";
import { toast } from "@/lib/toast";
import { cn } from "cn";
import { Count } from "@/components/ui/pill";
import { ChecksTab, useChecks } from "./ChecksTab";
import { ContentInspector } from "./ContentInspector";
import { DesignTab } from "./DesignTab";
import { JobPanel } from "./JobPanel";
import { Preview } from "./Preview";
import { StructureTab } from "./StructureTab";

// The Workspace (SPEC §14.5, mock views-workspace.js): bar, job panel, preview and inspector. History and export join
// the bar with their cards.

/** Fields with their own text undo; a slider, radio or colour input isn't one. */
const TEXT_FIELD = 'textarea, select, [contenteditable], input:not([type="range"], [type="radio"], [type="checkbox"], [type="color"], [type="button"])';

export type WorkspaceProps = { bundle: ProjectBundle; kb: KnowledgeBase; prefs: Prefs };
export const KIND_LABEL: Record<Kind, string> = { resume: "Resume", coverLetter: "Cover letter" };

export async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} copied as plain text`);
  } catch {
    toast("Couldn't copy. Select the text and copy it yourself.", { kind: "error" });
  }
}

export function Workspace(props: WorkspaceProps) {
  const [store] = useState(() => createWorkspaceStore(props.bundle.documents, props.bundle.project));
  useEffect(() => {
    const flush = () => store.getState().flush();
    // Ctrl/Cmd+Z undoes the last change, except in a text field, where the browser's own text undo applies.
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z" || el.closest(TEXT_FIELD)) return;
      e.preventDefault();
      store.getState().undo();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("keydown", onKey);
      store.getState().busy?.abort();
      flush(); // leaving for another page sends what's pending
    };
  }, [store]);
  return (
    <WorkspaceContext value={store}>
      <Frame {...props} />
    </WorkspaceContext>
  );
}

function Frame({ bundle: { project }, kb, prefs }: WorkspaceProps) {
  const kind = useWorkspace((s) => s.kind);
  const setKind = useWorkspace((s) => s.setKind);
  const doc = useWorkspace((s) => s.docs[s.kind]);
  const left = useWorkspace((s) => s.leftOpen);
  const leftTab = useWorkspace((s) => s.leftTab);
  const setLeftTab = useWorkspace((s) => s.setLeftTab);
  const tab = useWorkspace((s) => s.tab);
  const setTab = useWorkspace((s) => s.setTab);
  return (
    <div className="grid h-dvh grid-rows-[54px_minmax(0,1fr)] overflow-hidden max-[900px]:h-auto max-[900px]:overflow-visible">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-surface-2 pr-3.5 pl-4 max-[900px]:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/dashboard" className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-ink-2 no-underline hover:text-ink">
            <ChevronLeft className="size-[15px]" /> Applications
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="truncate font-semibold max-[900px]:hidden">
            {project.role} <span className="font-normal text-muted-foreground">at {project.company}</span>
          </span>
        </div>
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList aria-label="Document">
            {(["resume", "coverLetter"] as const).map((k) => (
              <TabsTrigger key={k} value={k}>
                {KIND_LABEL[k]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center justify-end gap-1.5 max-[900px]:col-span-2">
          <SavePill />
          <div className="mr-0.5 flex items-center gap-0.5 border-r border-line pr-2">
            <UndoButton />
            <Tooltip>
              <TooltipTrigger render={<Button size="icon" aria-label="Copy as plain text" disabled={!doc} onClick={() => doc && copyText(plainText(doc, kb, project.brief, prefs.spelling), KIND_LABEL[kind])} />}>
                <Copy />
              </TooltipTrigger>
              <TooltipContent>Copy as plain text, for job sites that ask you to paste</TooltipContent>
            </Tooltip>
          </div>
          <ModelPicker />
        </div>
      </header>
      {/* The panel starts open from 1180px wide (CSS, so nothing flashes); the toggle then sets it either way. */}
      <div
        className={cn(
          "grid min-h-0 max-[900px]:grid-cols-1",
          left === false ? "grid-cols-[0_minmax(0,1fr)_372px] max-[1180px]:grid-cols-[0_minmax(0,1fr)_340px]" : "grid-cols-[290px_minmax(0,1fr)_372px]",
          left === true && "max-[1180px]:grid-cols-[270px_minmax(0,1fr)_340px]",
          left === null && "max-[1180px]:grid-cols-[0_minmax(0,1fr)_340px]"
        )}
      >
        <aside
          id="job-panel"
          aria-label="Job and checks"
          className={cn(
            "flex min-h-0 flex-col overflow-hidden border-r border-line bg-surface-2 max-[900px]:max-h-[420px] max-[900px]:border-r-0 max-[900px]:border-b",
            left === false && "invisible max-[900px]:hidden",
            left === null && "max-[1180px]:invisible max-[900px]:hidden"
          )}
        >
          <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as "job" | "checks")} className="min-h-0 flex-1 gap-0">
            <TabsList aria-label="Job panel" className="mx-3 mt-3 w-auto">
              <TabsTrigger value="job">Job</TabsTrigger>
              <TabsTrigger value="checks">
                Checks <CheckCount kb={kb} project={project} />
              </TabsTrigger>
            </TabsList>
            <TabsContent value="job" className="flex min-h-0 flex-1 flex-col overflow-auto px-3.5 py-4 animate-in duration-(--t) ease-(--ease) fade-in-0">
              <JobPanel project={project} kb={kb} prefs={prefs} />
            </TabsContent>
            <TabsContent value="checks" className="flex min-h-0 flex-1 flex-col overflow-auto px-3.5 py-4 animate-in duration-(--t) ease-(--ease) fade-in-0">
              <ChecksTab kb={kb} brief={project.brief} />
            </TabsContent>
          </Tabs>
        </aside>
        <Preview kb={kb} brief={project.brief} prefs={prefs} />
        <aside aria-label="Inspector" className="flex min-h-0 flex-col border-l border-line bg-surface max-[900px]:border-t max-[900px]:border-l-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as InspectorTab)} className="flex min-h-0 flex-1 flex-col">
            <TabsList variant="underline" aria-label="Inspector">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="structure">Structure</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="min-h-0 flex-1 overflow-auto p-4">
              <ContentInspector kb={kb} brief={project.brief} prefs={prefs} />
            </TabsContent>
            <TabsContent value="structure" className="min-h-0 flex-1 overflow-auto p-4">
              <StructureTab />
            </TabsContent>
            <TabsContent value="design" className="min-h-0 flex-1 overflow-auto p-4">
              <DesignTab />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}

/** The Checks tab's count badge, warn when there is anything to review. */
function CheckCount({ kb, project }: Pick<WorkspaceProps, "kb"> & { project: WorkspaceProps["bundle"]["project"] }) {
  const n = useChecks(kb, project.brief)?.findings.length ?? 0;
  return n ? <Count className="bg-warn-soft text-warn">{n}</Count> : null;
}

function UndoButton() {
  const label = useWorkspace((s) => s.undoStack[s.kind].at(-1)?.label);
  const undo = useWorkspace((s) => s.undo);
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon" aria-label="Undo" disabled={!label} onClick={() => undo()} />}>
        <Undo2 />
      </TooltipTrigger>
      <TooltipContent>{label ? `Undo: ${label} (Ctrl+Z)` : "Nothing to undo"}</TooltipContent>
    </Tooltip>
  );
}

function SavePill() {
  const save = useWorkspace((s) => s.save);
  return (
    <span role="status" className="inline-flex items-center gap-[5px] px-1.5 text-[12.5px] whitespace-nowrap text-muted-foreground">
      {save === "saving" ? (
        <>
          <Loader2 aria-hidden className="size-[13px] animate-spin" /> Saving
        </>
      ) : save === "error" ? (
        <>
          <TriangleAlert aria-hidden className="size-[13px] text-warn" /> Not saved
        </>
      ) : (
        <>
          <Check aria-hidden className="size-[13px] text-primary" /> Saved
        </>
      )}
    </span>
  );
}
