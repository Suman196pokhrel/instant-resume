"use client";

import { useRef, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { matchedKeywords } from "@/lib/match/keywords";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { toast } from "@/lib/toast";

// Add evidence (SPEC §14.4 gaps, §14.5 Checks "Add it"; mock views-app.js openAddEvidence): saves a true fact as a
// highlight on a role, volunteer role or portfolio item, or on a new role made here, tagged with the keyword and the
// requirement it answers.

type Owner = "roles" | "volunteering" | "portfolio";
const GROUPS: [Owner, string][] = [
  ["roles", "Experience"],
  ["volunteering", "Volunteer work"],
  ["portfolio", "Portfolio"],
];
const nameOf = (e: { title?: string; company?: string; name?: string }) => e.name ?? `${e.title}, ${e.company}`;
const NEW = "new-role";
const ROLE_FIELDS = [
  { k: "title", label: "Job title", ph: "Retail Sales Assistant", error: "Enter the job title" },
  { k: "company", label: "Employer", ph: "Company name", error: "Enter the employer" },
  { k: "start", label: "Start", ph: "Mar 2022", error: "Enter when you started" },
  { k: "end", label: "End", ph: "Present", error: "Enter when it ended, or Present" },
] as const;
type RoleKey = (typeof ROLE_FIELDS)[number]["k"];

type Props = { kb: KnowledgeBase; requirement: string; keyword: string; keywords: string[]; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: (entry: string) => void };

export function AddEvidenceDialog({ kb, requirement, keyword, keywords, open, onOpenChange, onSaved }: Props) {
  const owners = GROUPS.flatMap(([type]) => (kb[type] ?? []).map((e) => ({ type, e })));
  const [owner, setOwner] = useState(owners[0]?.e.id ?? NEW);
  const [role, setRole] = useState<Record<RoleKey, string>>({ title: "", company: "", start: "", end: "" });
  const [roleErrors, setRoleErrors] = useState<Partial<Record<RoleKey, string>>>({});
  const [text, setText] = useState("");
  const [metric, setMetric] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  async function save() {
    const what = text.trim();
    const missing = owner === NEW ? Object.fromEntries(ROLE_FIELDS.filter((f) => !role[f.k].trim()).map((f) => [f.k, f.error])) : {};
    setRoleErrors(missing);
    if (!what) setError("Describe what you did");
    const first = Object.keys(missing)[0];
    if (first) return document.getElementById(`ev-${first}`)?.focus();
    if (!what) return box.current?.focus();
    const highlight = { text: what, metric: metric.trim() || undefined, skills: [...new Set([keyword, ...matchedKeywords(what, keywords)])], evidenceFor: requirement };
    setSaving(true);
    try {
      let label: string;
      if (owner === NEW) {
        const body = { ...Object.fromEntries(ROLE_FIELDS.map((f) => [f.k, role[f.k].trim()])), highlights: [highlight] };
        const res = await fetch("/api/kb/roles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(String(res.status));
        label = `${role.title.trim()}, ${role.company.trim()}`;
      } else {
        const target = owners.find((o) => o.e.id === owner);
        if (!target) return;
        const fresh: KnowledgeBase = await (await fetch("/api/kb")).json(); // the latest highlights, so none are lost
        const entry = fresh[target.type]?.find((e) => e.id === owner);
        if (!entry) throw new Error("gone");
        const res = await fetch(`/api/kb/${target.type}/${owner}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ highlights: [...entry.highlights, highlight] }) });
        if (!res.ok) throw new Error(String(res.status));
        label = nameOf(target.e);
      }
      toast(`Added to ${label}`);
      onOpenChange(false);
      setText("");
      setMetric("");
      setRole({ title: "", company: "", start: "", end: "" });
      onSaved?.(label);
    } catch {
      toast("Couldn't save it to your knowledge base. Try again.", { kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to your knowledge base</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <p>
            The job asks for <strong>{requirement}</strong>.
          </p>
          <Callout>
            <Info aria-hidden />
            <div>Only add what&apos;s true. Future resumes can use it.</div>
          </Callout>
          <Field id="ev-owner" label="Add it to">
            <NativeSelect value={owner} onChange={(e) => setOwner(e.target.value)}>
              {GROUPS.map(([type, label]) =>
                kb[type]?.length ? (
                  <optgroup key={type} label={label}>
                    {kb[type].map((e) => (
                      <option key={e.id} value={e.id}>
                        {nameOf(e)}
                      </option>
                    ))}
                  </optgroup>
                ) : null
              )}
              <option value={NEW}>New role…</option>
            </NativeSelect>
          </Field>
          {owner === NEW && (
            <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
              {ROLE_FIELDS.map((f) => (
                <Field key={f.k} id={`ev-${f.k}`} label={f.label} error={roleErrors[f.k]}>
                  <Input value={role[f.k]} placeholder={f.ph} onChange={(e) => (setRole({ ...role, [f.k]: e.target.value }), setRoleErrors({ ...roleErrors, [f.k]: undefined }))} />
                </Field>
              ))}
            </div>
          )}
          <Field id="ev-text" label="What you did and the result" error={error}>
            <Textarea
              ref={box}
              rows={3}
              value={text}
              onChange={(e) => (setText(e.target.value), setError(""))}
              placeholder="What you did, where, and what changed because of it. Include numbers if you have them."
            />
          </Field>
          <Field id="ev-metric" label="Metric" optional>
            <Input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="e.g. 40 to 8 minutes" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button onClick={save} disabled={saving}>
            Save to knowledge base
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
