"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, KeyRound, Loader2, RotateCcw, Target, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { AddEvidenceDialog } from "@/components/kb/AddEvidenceDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pill } from "@/components/ui/pill";
import { fileName, roleAt } from "@/lib/doc/filename";
import { plainText } from "@/lib/doc/plain-text";
import { downloadFile } from "@/lib/download";
import type { DocFinding, QuickSummary } from "@/lib/generate/pipeline";
import { kwMatch } from "@/lib/match/keywords";
import type { JobBrief } from "@/lib/schemas/brief";
import type { ResumeDocument } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";

// Quick generate result (SPEC §14.3 Result screen; mock views-quick.js renderResult): thumbnails, downloads, and
// the gaps and findings to review. Nothing here blocks a download.

type Kind = ResumeDocument["kind"];
type Doc = Omit<ResumeDocument, "id" | "projectId">;
export type QuickDone = { projectId: string; summary: QuickSummary; docs: Doc[]; brief: JobBrief; seconds: number; model: string };
const LABEL: Record<Kind, string> = { resume: "Resume", coverLetter: "Cover letter" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function useDownload(kb: KnowledgeBase, prefs: Prefs, brief: JobBrief) {
  const [state, setState] = useState<"idle" | "preparing" | "done">("idle");
  async function run(docs: Doc[]) {
    setState("preparing");
    try {
      const { render } = await import("@/lib/render/client");
      const data = { kb: { contact: kb.contact, workRights: kb.workRights }, brief: { title: brief.title }, paper: prefs.paper, spelling: prefs.spelling };
      const names = docs.map((d) => fileName(kb.contact.name, d.kind, brief.company));
      for (const [i, d] of docs.entries()) downloadFile(names[i], (await render(d.kind, { ...data, document: d }, "pdf")).artifact);
      toast(`Downloaded ${names.join(" and ")}`);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
      toast("Couldn't compile the PDF. Try again, or reload the page if it keeps happening.", { kind: "error" });
    }
  }
  return { state, run };
}

function DownloadButton({ label, docs, dl, variant }: { label: string; docs: Doc[]; dl: ReturnType<typeof useDownload>; variant?: "primary" | "ghost" }) {
  return (
    <Button size="sm" variant={variant} disabled={dl.state === "preparing"} onClick={() => dl.run(docs)}>
      {dl.state === "preparing" ? (
        <>
          <Loader2 aria-hidden className="animate-spin" /> Preparing
        </>
      ) : dl.state === "done" ? (
        <>
          <Check aria-hidden /> Downloaded
        </>
      ) : (
        <>
          <Download aria-hidden /> {label}
        </>
      )}
    </Button>
  );
}

function Thumb({ doc, kb, prefs, brief }: { doc: Doc; kb: KnowledgeBase; prefs: Prefs; brief: JobBrief }) {
  const [svg, setSvg] = useState("");
  const [pages, setPages] = useState(0);
  const dl = useDownload(kb, prefs, brief);
  useEffect(() => {
    let live = true;
    void import("@/lib/render/client").then(({ render }) =>
      render(doc.kind, { document: doc, kb: { contact: kb.contact, workRights: kb.workRights }, brief: { title: brief.title }, paper: prefs.paper, spelling: prefs.spelling }, "svg").then((r) => live && (setSvg(r.svg ?? ""), setPages(r.pages)))
    );
    return () => void (live = false);
  }, [doc, kb, prefs, brief.title]);
  const name = fileName(kb.contact.name, doc.kind, brief.company);
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div className="relative h-[300px] overflow-hidden rounded-md border border-line bg-sunken p-4">
        {svg && <div aria-hidden className="mx-auto w-[34%] min-w-[180px] bg-surface shadow-pop [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />}
        {pages > 0 && <Pill className="absolute top-2.5 right-2.5">{plural(pages, "page")}</Pill>}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <strong>{LABEL[doc.kind]}</strong>
          <code className="truncate font-mono text-[11.5px] text-ink-2">{name}</code>
        </span>
        <span className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              navigator.clipboard.writeText(plainText(doc, kb, brief, prefs.spelling)).then(
                () => toast(`${LABEL[doc.kind]} copied as plain text`),
                () => toast("Couldn't copy. Select the text and copy it yourself.", { kind: "error" })
              )
            }
          >
            <Copy aria-hidden /> Copy text
          </Button>
          <DownloadButton label="Download" docs={[doc]} dl={dl} variant="ghost" />
        </span>
      </figcaption>
    </figure>
  );
}

function GapRow({ gap, kb, brief, onRegenerate }: { gap: string; kb: KnowledgeBase; brief: JobBrief; onRegenerate: () => void }) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState("");
  const regen = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (added) regen.current?.focus();
  }, [added]);
  const keyword = brief.keywords.find((k) => kwMatch(gap, k)) ?? gap;
  return (
    <li className={cn("grid grid-cols-[16px_1fr_auto] items-start gap-2.5 py-2.5", added && "rounded-md bg-accent-soft px-2")}>
      {added ? <Check aria-hidden className="mt-0.5 size-4 text-primary" /> : <TriangleAlert aria-hidden className="mt-0.5 size-4 text-warn" />}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-xs px-1.5 text-[11px] font-semibold", added ? "bg-surface text-accent-ink" : "bg-warn-soft text-warn")}>{added ? "Added" : "Gap"}</span>
          <strong className="text-[13px]">{gap}</strong>
        </div>
        <p className="text-[13px] text-ink-2">{added ? `Saved to ${added}. Regenerate to use it.` : "Nothing in your knowledge base backs this up. Add it if it's true, then regenerate."}</p>
      </div>
      {added ? (
        <Button ref={regen} size="sm" onClick={onRegenerate}>
          <RotateCcw aria-hidden /> Regenerate
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          Add to knowledge base
        </Button>
      )}
      <AddEvidenceDialog kb={kb} requirement={gap} keyword={keyword} keywords={brief.keywords} open={open} onOpenChange={setOpen} onSaved={setAdded} />
    </li>
  );
}

const findingDetail = (f: DocFinding) =>
  f.type === "banned" ? `${LABEL[f.doc]}. Reads as generic or AI-written. Reword it in Studio.` : f.type === "grounding" ? `${LABEL[f.doc]}. Not backed by a fact in your knowledge base. Fix it in Studio or add the fact.` : f.detail;

export function QuickResult({ done, kb, prefs, onRegenerate }: { done: QuickDone; kb: KnowledgeBase; prefs: Prefs; onRegenerate: () => void }) {
  const { summary, docs, brief } = done;
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => head.current?.focus(), []);
  const both = useDownload(kb, prefs, brief);
  const n = summary.gaps.length + summary.findings.length;
  const letter = docs.some((d) => d.kind === "coverLetter");
  const tile = (warn: boolean, icon: React.ReactNode, text: string) => (
    <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2.5 text-[13px] font-medium", warn ? "border-warn-line bg-warn-soft text-warn" : "border-line bg-surface text-ink")}>
      {icon}
      {text}
    </div>
  );

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 ref={head} tabIndex={-1} className="outline-none">
            {letter ? "Your documents are ready" : "Your resume is ready"}
          </h1>
          <p className="mt-1 text-muted-foreground">{`${roleAt(brief.title, brief.company)}. Generated in ${done.seconds.toFixed(1)}s with ${done.model}.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="link" onClick={onRegenerate}>
            <RotateCcw aria-hidden /> Regenerate
          </Button>
          <Link href={`/projects/${done.projectId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Open in Studio
          </Link>
          <DownloadButton label={letter ? "Download both" : "Download resume"} docs={docs} dl={both} />
        </div>
      </div>
      <p role="status" className="sr-only">
        Your documents are ready
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2.5 max-[640px]:grid-cols-1">
        {tile(summary.coverage < 60, <Target aria-hidden className="size-4" />, `${summary.coverage}% keyword coverage`)}
        {tile(summary.gaps.length > 0, <KeyRound aria-hidden className="size-4" />, plural(summary.gaps.length, "gap"))}
        {tile(summary.findings.length > 0, <TriangleAlert aria-hidden className="size-4" />, plural(summary.findings.length, "finding"))}
      </div>
      <div className={cn("mt-5 grid gap-5", letter ? "grid-cols-2 max-[760px]:grid-cols-1" : "max-w-[520px] grid-cols-1")}>
        {docs.map((d) => (
          <Thumb key={d.kind} doc={d} kb={kb} prefs={prefs} brief={brief} />
        ))}
      </div>
      {n ? (
        <Collapsible defaultOpen className="mt-6 rounded-lg border border-line bg-surface p-4">
          <CollapsibleTrigger className="w-full text-sm text-ink">
            {`${plural(n, "item")} to review before you send`}
            <span className="ml-auto text-[13px] font-normal text-muted-foreground">Downloads aren&apos;t blocked</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul aria-label="Items to review" className="mt-2 divide-y divide-line">
              {summary.gaps.map((g) => (
                <GapRow key={g} gap={g} kb={kb} brief={brief} onRegenerate={onRegenerate} />
              ))}
              {summary.findings.map((f, i) => (
                <li key={i} className="grid grid-cols-[16px_1fr] items-start gap-2.5 py-2.5">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 text-danger" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-xs bg-danger-soft px-1.5 text-[11px] font-semibold text-danger">Finding</span>
                      <strong className="text-[13px]">{f.title}</strong>
                    </div>
                    <p className="text-[13px] text-ink-2">{findingDetail(f)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-muted-foreground">Fix findings in Studio, or add missing experience to your knowledge base and regenerate.</p>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="mt-6 flex items-center gap-2 rounded-md bg-accent-soft px-3.5 py-2.5 text-[13px] font-medium text-accent-ink">
          <Check aria-hidden className="size-4" /> No gaps or findings. Ready to send.
        </div>
      )}
    </div>
  );
}
