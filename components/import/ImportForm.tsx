"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { parseResume } from "@/lib/import/parse";
import { ONBOARDING_LAST_STEP } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Resume import (SPEC §14.1a, mock Views.import): read a TXT file or pasted text on this device, parse it into an
 * onboarding draft and open Review. Nothing reaches the knowledge base until the user saves it there.
 */
export function ImportForm({ unfinished }: { unfinished: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    if (!/\.(pdf|docx|txt)$/i.test(f.name)) return setError("Choose a PDF, DOCX or TXT file.");
    if (f.size > MAX_BYTES) return setError("This file is larger than 10 MB. Choose a smaller file or paste the text.");
    if (!f.size) return setError("This file is empty. Choose another file or paste the text.");
    // shortcut: PDF and Word need the provider extraction in TASK-11; until then only TXT is read.
    if (!/\.txt$/i.test(f.name)) return setError("Reading PDF and Word files arrives with your AI provider connection. For now, paste the text or choose a .txt file.");
    try {
      setText(await f.text());
      setFileName(f.name);
    } catch {
      setError("Could not read the file. Try another file or paste its text.");
    }
  }

  function extract() {
    if (text.trim().length < 20) return setError("Paste your resume text or choose a non-empty TXT file.");
    if (unfinished) setConfirming(true);
    else start();
  }

  async function start() {
    setBusy(true);
    const draft = parseResume(text);
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

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <label htmlFor="resume-file" className="flex flex-col items-center gap-3 rounded-lg border-[1.5px] border-dashed border-line-2 bg-surface-2 p-7 text-center">
        <Upload className="size-7 text-ink-2" />
        <strong>Choose an existing resume</strong>
        <span className="text-muted-foreground">PDF, Word (.docx), or plain text (.txt) · up to 10 MB</span>
        <input id="resume-file" type="file" accept=".pdf,.docx,.txt" aria-describedby="import-limit" onChange={onFile} className="max-w-full" />
      </label>
      <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-ink-2">
        <Info className="size-[13px]" /> No resume handy? Use your LinkedIn profile&apos;s <strong>Save to PDF</strong> option and import that file.
      </p>
      <p id="import-limit" className="mt-1 text-[13px] text-muted-foreground">
        Text files and pasted text are read on this device. Nothing is sent anywhere.
      </p>
      <p className="text-[13px]" aria-live="polite">
        {fileName && `${fileName} — ready to extract`}
      </p>
      <Field id="resume-text" label="Or paste your resume text" className="mt-3">
        <Textarea
          rows={12}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileName("");
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
      <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Link href="/onboarding/manual" className={buttonVariants({ variant: "ghost" })}>
          Enter manually instead
        </Link>
        <Button onClick={extract} disabled={busy}>
          Extract and review
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace the unfinished onboarding draft?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>Your saved knowledge base stays unchanged. This starts a new review from the imported details.</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button disabled={busy} onClick={start}>
              Review import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
