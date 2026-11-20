"use client";

import { useRef, useState } from "react";
import { Info, Loader2, Sparkles } from "lucide-react";
import { LlmErrorCallout } from "@/components/llm/LlmErrorCallout";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Chip } from "@/components/ui/pill";
import { suggestMissing, toHighlight, type Suggestion } from "@/lib/generate/missing";
import { getAdapter } from "@/lib/llm/adapter";
import { LlmError, outputError } from "@/lib/llm/errors";
import type { JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { toast } from "@/lib/toast";

// Add what's missing (SPEC §14.5 Checks, §8.3 call 5; mock views-app.js openAddMissing): say in your own words where you
// used the missing keywords, check the bullets the model writes from it, and add the ones you keep to the knowledge base.

type Props = { kb: KnowledgeBase; brief: JobBrief; keywords: string[]; spelling: "en-AU" | "en-US"; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: () => void };
type Row = Suggestion & { on: boolean };

/** Mount it with a new key for each opening, so it starts with every missing keyword ticked. */
export function AddMissingDialog({ kb, brief, keywords, spelling, open, onOpenChange, onSaved }: Props) {
  const [picked, setPicked] = useState(keywords);
  const [text, setText] = useState("");
  const [textError, setTextError] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null); // null: still writing what you used
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LlmError | null>(null);
  const call = useRef<AbortController | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  function close(next: boolean) {
    if (!next) {
      call.current?.abort();
      setBusy(false);
    }
    onOpenChange(next);
  }

  async function write() {
    if (!text.trim()) return setTextError("Say where you used them"), box.current?.focus();
    const controller = new AbortController();
    call.current = controller;
    setBusy(true);
    setError(null);
    try {
      const r = await suggestMissing({ kb, brief, keywords: picked, text, spelling }, await getAdapter(), controller.signal);
      if (controller.signal.aborted) return;
      setRows(r.suggestions.map((s) => ({ ...s, on: true })));
      setNote(r.note);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof LlmError ? e : outputError());
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function add() {
    const keep = (rows ?? []).filter((r) => r.on && r.text.trim());
    setBusy(true);
    try {
      const fresh: KnowledgeBase = await (await fetch("/api/kb")).json(); // the latest highlights, so none are lost
      for (const id of new Set(keep.map((r) => r.entryId))) {
        const mine = keep.filter((r) => r.entryId === id);
        const entry = fresh[mine[0].type]?.find((e) => e.id === id);
        if (!entry) throw new Error("gone");
        const highlights = [...entry.highlights, ...mine.map((r) => toHighlight({ ...r, text: r.text.trim() }, brief))];
        const res = await fetch(`/api/kb/${mine[0].type}/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ highlights }) });
        if (!res.ok) throw new Error(String(res.status));
      }
      toast(`Added ${keep.length} to your knowledge base`);
      setRows(null);
      setText("");
      onOpenChange(false);
      onSaved?.();
    } catch {
      toast("Couldn't save them to your knowledge base. Try again.", { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const kept = rows?.filter((r) => r.on && r.text.trim()).length ?? 0;
  const groups = rows ? [...new Set(rows.map((r) => r.entryId))].map((id) => rows.filter((r) => r.entryId === id)) : [];
  const edit = (i: number, change: Partial<Row>) => setRows((rs) => rs && rs.map((r, k) => (k === i ? { ...r, ...change } : r)));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add what&apos;s missing</DialogTitle>
        </DialogHeader>
        {rows === null ? (
          <DialogBody className="flex flex-col gap-3">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-medium text-ink">Missing from this job</legend>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k) => (
                  <label key={k} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface-2 py-[3px] pr-[9px] pl-1 text-[12.5px] text-ink-2">
                    <Checkbox checked={picked.includes(k)} disabled={busy} onCheckedChange={(on) => setPicked((p) => (on ? [...p, k] : p.filter((x) => x !== k)))} className="size-4" />
                    {k}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field id="missing-text" label="Where did you use them?" error={textError}>
              <Textarea
                ref={box}
                rows={4}
                value={text}
                disabled={busy}
                onChange={(e) => (setText(e.target.value), setTextError(""))}
                onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), write())}
                placeholder="e.g. I used Docker and Kubernetes in my weather app project, and set up CI/CD with GitHub Actions at my last job"
              />
            </Field>
            <p className="text-[12.5px] text-muted-foreground">You&apos;ll check the bullets before anything is saved. Future resumes can use them too.</p>
            {error && <LlmErrorCallout error={error} onRetry={write} />}
          </DialogBody>
        ) : (
          <DialogBody className="flex flex-col gap-4">
            {note && (
              <Callout>
                <Info aria-hidden />
                <div>{note}</div>
              </Callout>
            )}
            {groups.length ? (
              groups.map((g) => (
                <section key={g[0].entryId} aria-label={g[0].label} className="flex flex-col gap-2">
                  <h3 className="text-[13px] font-semibold text-ink">{g[0].label}</h3>
                  {g.map((r) => {
                    const i = rows!.indexOf(r);
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        <Checkbox aria-label={`Keep: ${r.text}`} checked={r.on} onCheckedChange={(on) => edit(i, { on })} className="mt-2" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <Textarea aria-label="Bullet" rows={2} value={r.text} disabled={!r.on} onChange={(e) => edit(i, { text: e.target.value })} />
                          {r.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {r.keywords.map((k) => (
                                <Chip key={k}>{k}</Chip>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))
            ) : (
              <p className="text-ink-2">No bullets came out of that. Go back and say which job or project you used them in.</p>
            )}
          </DialogBody>
        )}
        <DialogFooter>
          {rows === null ? (
            <>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button onClick={write} disabled={busy || !picked.length}>
                {busy ? <Loader2 aria-hidden className="animate-spin" /> : <Sparkles aria-hidden />}
                {busy ? "Writing" : "Write it"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setRows(null)} disabled={busy}>
                Back
              </Button>
              <Button onClick={add} disabled={busy || !kept}>
                {kept === 1 ? "Add 1 to knowledge base" : `Add ${kept} to knowledge base`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
