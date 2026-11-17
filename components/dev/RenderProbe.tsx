"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RenderKind, RenderResult } from "@/lib/render/types";
import kb from "@/tests/fixtures/kb.json";
import resume from "@/tests/fixtures/resume.json";
import letter from "@/tests/fixtures/cover-letter.json";

const DOCS = { resume, coverLetter: letter };
type Shown = { kind: RenderKind; url: string } & Omit<RenderResult, "artifact">;

export function RenderProbe() {
  const [shown, setShown] = useState<Shown[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(kind: RenderKind, bump = 0) {
    setBusy(true);
    setError("");
    try {
      const { render } = await import("@/lib/render/client");
      const doc = DOCS[kind];
      const document = { ...doc, theme: { ...doc.theme, baseSize: doc.theme.baseSize + bump } };
      const result = await render(kind, {
        document,
        kb: { contact: kb.contact, workRights: kb.workRights },
        brief: { title: "Senior Full Stack Engineer" },
        paper: "A4",
        spelling: "en-AU",
      });
      const url = URL.createObjectURL(new Blob([result.artifact as BlobPart], { type: "application/pdf" }));
      setShown((s) => [{ kind, url, pages: result.pages, ms: result.ms }, ...s]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => run("resume")}>Render resume</Button>
        <Button variant="ghost" disabled={busy} onClick={() => run("coverLetter")}>Render cover letter</Button>
        <Button variant="ghost" disabled={busy} onClick={() => run("resume", 0.5)}>Change theme</Button>
      </div>
      {error && <pre role="alert" className="text-danger whitespace-pre-wrap">{error}</pre>}
      <ol aria-label="Renders" className="flex flex-col gap-1.5">
        {shown.map((s, i) => (
          <li key={i} data-kind={s.kind} data-ms={s.ms} className="tabular-nums">
            Rendered in {s.ms} ms · {s.pages} {s.pages === 1 ? "page" : "pages"} · A4 ·{" "}
            <a href={s.url} download={`${s.kind}.pdf`}>Download {s.kind === "resume" ? "resume" : "cover letter"}</a>
          </li>
        ))}
      </ol>
    </div>
  );
}
