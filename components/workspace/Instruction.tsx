"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { LlmErrorCallout } from "@/components/llm/LlmErrorCallout";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Chip } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sectionDiff, type Part } from "@/lib/doc/diff";
import { sectionText } from "@/lib/doc/plain-text";
import { noChangeExample, rewriteSection, rewriteTokens, rewriteWarnings, type RewriteInput } from "@/lib/generate/rewrite";
import { getAdapter } from "@/lib/llm/adapter";
import { LlmError, outputError } from "@/lib/llm/errors";
import { useLlmChoice } from "@/lib/llm/use-choice";
import { kbText, kwMatch } from "@/lib/match/keywords";
import type { JobBrief } from "@/lib/schemas/brief";
import type { Section } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Prefs } from "@/lib/schemas/settings";
import { useWorkspace } from "@/lib/stores/workspace";
import { toast } from "@/lib/toast";

// Inspector, Content tab: the Instruction box and the Proposal card that replaces it (SPEC §8.3 call 4, §14.5;
// mock views-workspace.js renderInstruction).

type Props = { section: Section; kb: KnowledgeBase; brief: JobBrief; prefs: Prefs; notes?: string };

/** Suggestion chips by section kind; {kw} is the first job keyword missing from this document that the KB backs. */
function suggestions(s: Section, docText: string, kb: KnowledgeBase, brief: JobBrief) {
  const all = kbText(kb);
  const kw = brief.keywords.find((k) => !kwMatch(docText, k) && kwMatch(all, k)) ?? brief.keywords[0] ?? "your strongest skill";
  if (s.kind === "paragraph") return ["More concise", "More formal", "Warmer tone", `Emphasise ${kw}`];
  if (s.kind === "skills") return [`Emphasise ${kw}`, `Emphasise ${brief.keywords.find((k) => k !== kw) ?? "TypeScript"}`];
  if (s.kind === "summary") return ["More concise", `Emphasise ${kw}`, "Stronger verbs"];
  return ["More concise", `Emphasise ${kw}`, "Lead with metrics", "Stronger verbs"];
}

export function Instruction({ section: s, kb, brief, prefs, notes }: Props) {
  const kind = useWorkspace((x) => x.kind);
  const doc = useWorkspace((x) => x.docs[x.kind])!;
  const resume = useWorkspace((x) => x.docs.resume);
  const busy = useWorkspace((x) => !!x.busy);
  const pending = useWorkspace((x) => (x.pending?.sectionId === s.id ? x.pending : null));
  const setBusy = useWorkspace((x) => x.setBusy);
  const propose = useWorkspace((x) => x.propose);
  const accept = useWorkspace((x) => x.accept);
  const reject = useWorkspace((x) => x.reject);
  const { active } = useLlmChoice();
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<LlmError | null>(null);
  const [back, setBack] = useState(false); // focus the box when returning from a proposal
  const box = useRef<HTMLTextAreaElement>(null);
  const refocus = () => setTimeout(() => box.current?.focus()); // once it is enabled again
  const noun = s.kind === "paragraph" ? "paragraph" : "section";
  const input = (instruction: string): RewriteInput => ({ doc, resume, sectionId: s.id, instruction, kb, brief, notes, tone: prefs.quick.tone, spelling: prefs.spelling });

  async function run(text = draft) {
    const instruction = text.trim();
    setError(null);
    if (!instruction) return setMessage("Type an instruction first, or pick one of the suggestions.");
    setMessage("");
    const controller = new AbortController();
    setBusy(controller);
    try {
      const r = await rewriteSection(input(instruction), await getAdapter(), controller.signal);
      if (controller.signal.aborted) return;
      if (!r) {
        setBusy(null);
        refocus();
        return setMessage(`No change suggested for "${instruction}". Try a different instruction, like "${noChangeExample(instruction, brief)}".`);
      }
      propose({ sectionId: s.id, kind, before: s, after: r.after, instruction, ops: r.ops, warnings: rewriteWarnings(instruction, kb) });
    } catch (e) {
      if (controller.signal.aborted) return; // left the section: nothing to show
      setBusy(null);
      refocus();
      setError(e instanceof LlmError ? e : outputError());
    }
  }

  if (pending)
    return (
      <Proposal
        {...pending}
        onAccept={() => {
          accept();
          setDraft("");
          setBack(true);
          toast(`Change applied to ${pending.before.title}`); // shortcut: no Undo action until TASK-19 adds undo
        }}
        onReject={() => {
          reject();
          setBack(true);
          toast("Change rejected. Nothing was applied.");
        }}
      />
    );

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3.5 shadow-card">
      <label htmlFor="instruction" className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <Sparkles aria-hidden className="size-3.5 text-primary" /> Rewrite this {noun}
      </label>
      <div className="rounded-md border border-line-2 bg-surface transition-[border-color,box-shadow] duration-(--t) ease-(--ease) focus-within:border-primary focus-within:ring-3 focus-within:ring-accent-soft has-disabled:bg-surface-2">
        <Textarea
          id="instruction"
          ref={box}
          rows={2}
          autoFocus={back}
          value={draft}
          disabled={busy}
          placeholder="e.g. more concise, emphasise GraphQL"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), run())}
          className="resize-none border-0 bg-transparent px-2.5 pt-2 pb-0.5 shadow-none! focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 pt-1 pr-1.5 pb-1.5 pl-2.5">
          <span className="text-[12.5px] text-muted-foreground">
            Sends only this {noun}, about {rewriteTokens(input(draft || "x")).toLocaleString("en-AU")} tokens
          </span>
          <Tooltip>
            <TooltipTrigger render={<Button size="sm" disabled={busy} onClick={() => run()} />}>
              {busy ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" /> Rewriting
                </>
              ) : (
                "Rewrite"
              )}
            </TooltipTrigger>
            <TooltipContent>Ctrl+Enter</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions(s, doc.sections.map(sectionText).join(" "), kb, brief).map((c) => (
          <button
            key={c}
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft(c);
              run(c);
            }}
            className="group cursor-pointer rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50"
          >
            <Chip className="text-xs transition-colors duration-(--t) ease-(--ease) group-hover:group-enabled:border-line-2 group-hover:group-enabled:text-ink">{c}</Chip>
          </button>
        ))}
      </div>
      <div role="status">
        {busy && (
          <div className="relative overflow-hidden rounded-[5px] bg-accent-soft px-2.5 py-1.5 text-[12.5px] font-medium text-accent-ink">
            Rewriting with {active?.model ?? "your model"}
            <div aria-hidden className="absolute inset-0 shimmer animate-sweep" />
          </div>
        )}
        {message && <p className="text-[12.5px] text-danger">{message}</p>}
      </div>
      {error && <LlmErrorCallout error={error} onRetry={() => run()} />}
    </div>
  );
}

function Words({ parts }: { parts: Part[] }) {
  return parts.map((p, i) =>
    p.t === "del" ? (
      <del key={i} className="rounded-[2px] bg-danger-soft text-danger decoration-danger/50">
        {p.text}
      </del>
    ) : p.t === "ins" ? (
      <ins key={i} className="rounded-[2px] bg-accent-soft text-accent-ink no-underline">
        {p.text}
      </ins>
    ) : (
      <span key={i}>{p.text}</span>
    )
  );
}

function Proposal({ before, after, instruction, ops, warnings, onAccept, onReject }: { before: Section; after: Section; instruction: string; ops: unknown[]; warnings: string[]; onAccept: () => void; onReject: () => void }) {
  const head = useRef<HTMLDivElement>(null);
  useEffect(() => head.current?.focus(), []);
  const diff = sectionDiff(before, after);
  return (
    <div className="flex origin-top animate-pop flex-col gap-2.5 rounded-lg border border-line bg-surface p-3.5 shadow-card">
      <div ref={head} tabIndex={-1} className="flex items-start gap-2 outline-none">
        <Sparkles aria-hidden className="mt-[3px] size-3.5 shrink-0 text-warn" />
        <div className="flex min-w-0 flex-col gap-px">
          <strong>Proposed change</strong>
          <span className="text-[13px] text-muted-foreground">{`"${instruction}"`}</span>
        </div>
      </div>
      <div aria-label="Changes" className="max-h-[340px] overflow-auto rounded-sm border border-line bg-surface px-3 py-2.5 text-[13px] leading-[1.55]">
        {diff.text && (
          <p>
            <Words parts={diff.text} />
          </p>
        )}
        {diff.items?.map((it, k) => (
          <div key={k} className="[&+&]:mt-2">
            <div className="text-[12.5px] font-semibold text-ink-2">{it.head}</div>
            {it.line && (
              <div>
                <Words parts={it.line} />
              </div>
            )}
            {it.bullets.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {it.bullets.map((b, j) => (
                  <li key={j} className="my-[3px]">
                    <Words parts={b.parts} />
                    {b.tag && (
                      <span className={`ml-1.5 inline-block rounded-[3px] px-[5px] align-[1px] text-[10.5px] font-semibold ${b.tag === "removed" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-ink"}`}>{b.tag}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {warnings.map((w) => (
        <Callout key={w} variant="warn" className="text-[13px]">
          <TriangleAlert aria-hidden />
          <div>{w}</div>
        </Callout>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" onClick={onAccept} className="justify-center">
          <Check /> Accept
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject} className="justify-center">
          Reject
        </Button>
      </div>
      <Collapsible>
        <CollapsibleTrigger className="text-xs font-normal text-muted-foreground">
          {ops.length} patch {ops.length === 1 ? "operation" : "operations"}, validated
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-1.5 max-h-[200px] overflow-auto rounded-sm bg-ink p-2.5 font-mono text-[11px] leading-[1.45] text-surface-2">{JSON.stringify(ops, null, 2)}</pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
