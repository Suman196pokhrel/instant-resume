"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/download";
import { toast } from "@/lib/toast";

/** Export backup and Import backup (SPEC §14.6), in Settings → Your data and the Knowledge base top bar. */
export function BackupButtons({ order = "export-first" }: { order?: "export-first" | "import-first" }) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);

  async function exportIt() {
    const res = await fetch("/api/backup").catch(() => null);
    if (!res?.ok) return toast("Couldn't export a backup. Try again.", { kind: "error" });
    const name = `instant-resume-backup-${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(name, new TextEncoder().encode(JSON.stringify(await res.json(), null, 2)), "application/json");
    toast(`Exported ${name}`);
  }

  async function importIt(file: File | undefined) {
    if (!file) return;
    picker.current!.value = ""; // picking the same file again still fires change
    const res = await file
      .text()
      .then((text) => fetch("/api/backup", { method: "POST", headers: { "content-type": "application/json" }, body: text }))
      .catch(() => null);
    if (!res?.ok) return toast("Import failed: this file isn't a Instant Resume backup", { kind: "error" });
    const { projects: n } = (await res.json()) as { projects: number };
    toast(`Imported your knowledge base and ${n} ${n === 1 ? "application" : "applications"}`);
    router.refresh();
  }

  const exportButton = (
    <Button key="export" variant="ghost" onClick={exportIt}>
      <Download /> Export backup
    </Button>
  );
  const importButton = (
    <Button key="import" variant="ghost" onClick={() => picker.current?.click()}>
      <Upload /> Import backup
    </Button>
  );
  return (
    <>
      {order === "export-first" ? [exportButton, importButton] : [importButton, exportButton]}
      <input ref={picker} type="file" accept="application/json,.json" hidden aria-hidden tabIndex={-1} onChange={(e) => importIt(e.target.files?.[0])} />
    </>
  );
}
