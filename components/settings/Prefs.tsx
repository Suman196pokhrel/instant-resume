"use client";

import { useState } from "react";
import { NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import type { Prefs } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";
import { WritingInstructions } from "./Instructions";

const THEMES = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "compact", label: "Compact" },
] as const;
const TONES = ["Professional", "Warm", "Concise"] as const;
const PAPERS: { value: Prefs["paper"]; label: string }[] = [
  { value: "A4", label: "A4" },
  { value: "Letter", label: "Letter" },
];
const SPELLINGS: { value: Prefs["spelling"]; label: string }[] = [
  { value: "en-AU", label: "Australian" },
  { value: "en-US", label: "US" },
];

function Pref({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div>
        <strong>{title}</strong>
        <div className="text-[12.5px] text-muted-foreground">{help}</div>
      </div>
      {children}
    </div>
  );
}

/** Settings → Quick generate defaults and Preferences (SPEC §13.3 items 2–3, mock quickSettingsHtml). One prefs state, so each PUT sends the whole set. */
export function PrefsSettings({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);

  async function save(next: Prefs, done = "Preference saved") {
    const before = prefs;
    setPrefs(next);
    const res = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) }).catch(() => null);
    if (res?.ok) {
      toast(done);
      return true;
    }
    setPrefs(before);
    toast("Couldn't save that preference. Try again.", { kind: "error" });
    return false;
  }
  const q = prefs.quick;
  const setQuick = (patch: Partial<Prefs["quick"]>) => save({ ...prefs, quick: { ...q, ...patch } });

  return (
    <>
    <section className="mb-[34px]">
      <h2 className="mb-1">Quick generate defaults</h2>
      <p className="mb-3.5 text-muted-foreground">Used when you go straight from a job description to finished documents.</p>
      <div className="divide-y divide-line rounded-lg border border-line bg-surface">
        <Pref title="Default theme" help="Font, spacing and accent colour">
          <NativeSelect aria-label="Default theme" className="w-auto min-w-40" value={q.theme} onChange={(e) => setQuick({ theme: e.target.value as Prefs["quick"]["theme"] })}>
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </Pref>
        <Pref title="Page budget" help="The resume is trimmed to fit">
          <Segmented
            aria-label="Page budget"
            options={[
              { value: "1", label: "1 page" },
              { value: "2", label: "2 pages" },
            ]}
            value={String(q.pages) as "1" | "2"}
            onValueChange={(v) => setQuick({ pages: v === "1" ? 1 : 2 })}
          />
        </Pref>
        <Pref title="Cover letter" help="Write one alongside the resume">
          <Switch aria-label="Cover letter" checked={q.coverLetter} onCheckedChange={(on) => setQuick({ coverLetter: on })} />
        </Pref>
        <Pref title="Cover letter tone" help="You can change it per paragraph in Studio">
          <NativeSelect aria-label="Cover letter tone" className="w-auto min-w-40" value={q.tone} disabled={!q.coverLetter} onChange={(e) => setQuick({ tone: e.target.value as Prefs["quick"]["tone"] })}>
            {TONES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        </Pref>
      </div>
    </section>
    <section className="mb-[34px]">
      <h2 className="mb-3.5">Preferences</h2>
      <div className="divide-y divide-line rounded-lg border border-line bg-surface">
        <Pref title="Paper size" help="Used for preview and export">
          <Segmented aria-label="Paper size" options={PAPERS} value={prefs.paper} onValueChange={(paper) => save({ ...prefs, paper })} />
        </Pref>
        <Pref title="Spelling and conventions" help="Australian adds work rights and referees to resumes">
          <Segmented aria-label="Spelling and conventions" options={SPELLINGS} value={prefs.spelling} onValueChange={(spelling) => save({ ...prefs, spelling })} />
        </Pref>
      </div>
    </section>
    <WritingInstructions saved={prefs.instructions} onSave={(instructions) => save({ ...prefs, instructions }, "Instructions saved")} />
    </>
  );
}
