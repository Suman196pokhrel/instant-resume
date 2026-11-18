"use client";

import { useState } from "react";
import { Download, FileText, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { runChecks } from "@/lib/checks/run";
import { fileName } from "@/lib/doc/filename";
import type { Project } from "@/lib/schemas/project";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";
import { useWorkspace, type Kind } from "@/lib/stores/workspace";
import { toast } from "@/lib/toast";
import { KIND_LABEL } from "./Workspace";

// Export (SPEC §9.3; mock views-workspace.js openExport): Typst compiles each ticked document to PDF in the worker,
// then the browser downloads it. Checks never block an export.

const KINDS: Kind[] = ["resume", "coverLetter"];

function download(name: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // after the download has started
}

export function ExportDialog({ project, kb, prefs }: { project: Project; kb: KnowledgeBase; prefs: Prefs }) {
  const [open, setOpen] = useState(false);
  const kind = useWorkspace((s) => s.kind);
  const docs = useWorkspace((s) => s.docs);
  const notes = useWorkspace((s) => s.notes);
  const [picked, setPicked] = useState<Kind[]>([kind]);
  const [busy, setBusy] = useState(false);
  const names = Object.fromEntries(KINDS.map((k) => [k, fileName(kb.contact.name, k, project.company)])) as Record<Kind, string>;
  const issues = open ? KINDS.reduce((n, k) => n + (docs[k] ? runChecks(docs[k], project.brief, kb, notes).findings.length : 0), 0) : 0;

  async function run() {
    setBusy(true);
    try {
      const { render } = await import("@/lib/render/client");
      const data = { kb: { contact: kb.contact, workRights: kb.workRights }, brief: { title: project.brief.title }, paper: prefs.paper, spelling: prefs.spelling };
      const chosen = KINDS.filter((k) => picked.includes(k) && docs[k]);
      for (const k of chosen) download(names[k], (await render(k, { ...data, document: docs[k] }, "pdf")).artifact);
      setOpen(false);
      toast(`Exported ${chosen.map((k) => names[k]).join(" and ")}`);
    } catch {
      toast("Couldn't compile the PDF. Try again, or reload the page if it keeps happening.", { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setPicked([kind]); // the open document is pre-ticked each time
        setOpen(o);
      }}
    >
      <DialogTrigger render={<Button size="sm" disabled={!docs[kind]} />}>
        <Download /> Export PDF
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export PDF</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-2">
          {issues > 0 && (
            <Callout variant="warn" className="text-[13px]">
              <TriangleAlert aria-hidden />
              <div>{`Checks found ${issues} ${issues === 1 ? "issue" : "issues"} across both documents. You can still export.`}</div>
            </Callout>
          )}
          {KINDS.map((k) => (
            <label key={k} className="grid cursor-pointer grid-cols-[18px_22px_1fr] items-center gap-2.5 rounded-md border border-line p-3 transition-colors duration-(--t) ease-(--ease) has-data-checked:border-accent-line has-data-checked:bg-accent-soft/40">
              <Checkbox checked={picked.includes(k)} disabled={!docs[k]} onCheckedChange={(on) => setPicked((p) => (on ? [...p, k] : p.filter((x) => x !== k)))} />
              <FileText aria-hidden className="size-4 text-ink-2" />
              <span className="flex min-w-0 flex-col">
                <strong>{KIND_LABEL[k]}</strong>
                <code className="truncate font-mono text-[11.5px] text-ink-2">{names[k]}</code>
              </span>
            </label>
          ))}
          <p className="text-[13px] text-muted-foreground">{prefs.paper}, single column, selectable text in reading order.</p>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button onClick={run} disabled={busy || !picked.length}>
            {busy ? (
              <>
                <Loader2 aria-hidden className="animate-spin" /> Compiling with Typst
              </>
            ) : (
              "Export PDF"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
