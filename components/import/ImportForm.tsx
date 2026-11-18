"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Upload } from "lucide-react";
import { LlmErrorCallout } from "@/components/llm/LlmErrorCallout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { extractResume } from "@/lib/import/extract";
import { parseResume, type ParsedDraft } from "@/lib/import/parse";
import { readResumeFile } from "@/lib/import/read-file";
import { getAdapter } from "@/lib/llm/adapter";
import { LlmError } from "@/lib/llm/errors";
import { provider } from "@/lib/llm/providers";
import { useLlmChoice } from "@/lib/llm/use-choice";
import { ONBOARDING_LAST_STEP } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";

/**
 * Resume import (SPEC §14.1a, mock Views.import): files are read on this device. With a connected model, the text
 * goes to the provider only after the user agrees; otherwise the basic on-device parser sorts it. Either way the
 * result opens Review as an onboarding draft, and nothing reaches the knowledge base until the user saves it there.
 */
export function ImportForm({ unfinished }: { unfinished: boolean }) {
  const router = useRouter();
  const { active } = useLlmChoice();
  const name = active && provider(active.provider).name;
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"send" | "replace" | null>(null);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [reading, setReading] = useState(false);
  const [llmError, setLlmError] = useState<LlmError | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setLlmError(null);
    setStatus(`Reading ${f.name}…`);
    setReading(true);
    const result = await readResumeFile(f);
    setReading(false);
    if ("error" in result) {
      setStatus("");
      return setError(result.error);
    }
    setText(result.text);
    setFileName(f.name);
    setStatus(`${f.name} — ready to extract`);
  }

  function extract() {
    if (text.trim().length < 20) return setError("Paste your resume text or choose a non-empty file.");
    setLlmError(null);
    if (active) setDialog("send");
    else if (unfinished) setDialog("replace");
    else save(parseResume(text));
  }

  async function save(draft: ParsedDraft) {
    setDialog(null);
    setBusy(true);
    const state = { step: ONBOARDING_LAST_STEP, maxStep: ONBOARDING_LAST_STEP, draft, completed: false, saveMode: "merge", imported: fileName || "Pasted resume text" };
    try {
      const res = await fetch("/api/onboarding", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
      if (!res.ok) throw new Error(String(res.status));
      router.push("/onboarding/manual");
    } catch {
      setBusy(false);
      toast("Couldn't start the review. Try again.", { kind: "error" });
    }
  }

  async function send() {
    setDialog(null);
    setLlmError(null);
    setExtracting(true);
    const controller = (abort.current = new AbortController());
    try {
      const draft = await extractResume(text, await getAdapter(), controller.signal);
      setExtracting(false);
      await save(draft);
    } catch (e) {
      setExtracting(false);
      if (controller.signal.aborted) return; // cancelled: back to the form with the text intact
      setLlmError(e instanceof LlmError ? e : new LlmError("other", "Something went wrong", "Try again in a moment."));
    }
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <label htmlFor="resume-file" className="flex flex-col items-center gap-3 rounded-lg border-[1.5px] border-dashed border-line-2 bg-surface-2 p-7 text-center">
        <Upload className="size-7 text-ink-2" />
        <strong>Choose an existing resume</strong>
        <span className="text-muted-foreground">PDF, Word (.docx), or plain text (.txt) · up to 10 MB</span>
        <input id="resume-file" type="file" accept=".pdf,.docx,.txt" aria-describedby="import-limit" onChange={onFile} disabled={extracting} className="max-w-full" />
      </label>
      <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-ink-2">
        <Info className="size-[13px]" /> No resume handy? Use your LinkedIn profile&apos;s <strong>Save to PDF</strong> option and import that file.
      </p>
      <p id="import-limit" className="mt-1 text-[13px] text-muted-foreground">
        Files are read on this device. Your text goes to your AI provider only after you confirm.
      </p>
      <p className="text-[13px]" aria-live="polite">
        {extracting ? `Sorting your resume with ${name}. This usually takes 10 to 30 seconds.` : status}
      </p>
      <Field id="resume-text" label="Or paste your resume text" className="mt-3">
        <Textarea
          rows={12}
          value={text}
          readOnly={extracting}
          onChange={(e) => {
            setText(e.target.value);
            setFileName("");
            setStatus("");
          }}
          placeholder={"Your name and contact details\n\nEXPERIENCE\nRole | Organisation\nWhat you did…\n\nVOLUNTEER WORK\n…"}
        />
      </Field>
      <Callout className="my-3">
        <div>
          <strong>Every section has a place.</strong>
          <p className="mt-1">
            Contact, experience, volunteer work, education, skills, projects, credentials and referees are editable. Other sections are kept under Additional sections. Original text
            is retained for comparison.
          </p>
        </div>
      </Callout>
      {error && (
        <p role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
      {llmError && <LlmErrorCallout error={llmError} onRetry={send} />}
      <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Link href="/onboarding/manual" className={buttonVariants({ variant: "ghost" })}>
          Enter manually instead
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {llmError && (
            <Button variant="ghost" onClick={() => save(parseResume(text))} disabled={busy}>
              Read on this device instead
            </Button>
          )}
          {extracting && (
            <Button variant="ghost" onClick={() => abort.current?.abort()}>
              Cancel
            </Button>
          )}
          <Button onClick={extract} disabled={busy || extracting || reading}>
            {extracting ? "Extracting…" : "Extract and review"}
          </Button>
        </div>
      </div>
      {!active && <p className="mt-2 text-right text-[13px] text-muted-foreground">Connect a provider in Settings for better extraction. Without one, a basic parser on this device sorts the text.</p>}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "send" ? `Send your resume to ${name}?` : "Replace the unfinished onboarding draft?"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {dialog === "send" ? (
              <DialogDescription>
                Your resume text goes straight from this browser to {name} ({active?.model}) to sort it into sections. It isn&apos;t sent to Instant Resume&apos;s server.
                {unfinished && " This replaces your unfinished onboarding draft."}
              </DialogDescription>
            ) : (
              <DialogDescription>Your saved knowledge base stays unchanged. This starts a new review from the imported details.</DialogDescription>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            {dialog === "send" ? (
              <>
                <Button variant="ghost" disabled={busy} onClick={() => save(parseResume(text))}>
                  Read on this device instead
                </Button>
                <Button disabled={busy} onClick={send}>
                  Send to {name}
                </Button>
              </>
            ) : (
              <Button disabled={busy} onClick={() => save(parseResume(text))}>
                Review import
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
