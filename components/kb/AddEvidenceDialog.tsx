"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { matchedKeywords } from "@/lib/match/keywords";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { toast } from "@/lib/toast";

// Add evidence (SPEC §14.4 gaps, §14.5 Checks "Add it"; mock views-app.js openAddEvidence): saves a true fact as a
// highlight on a role, volunteer role or portfolio item, tagged with the keyword and the requirement it answers.

type Owner = "roles" | "volunteering" | "portfolio";
const GROUPS: [Owner, string][] = [
  ["roles", "Experience"],
  ["volunteering", "Volunteer work"],
  ["portfolio", "Portfolio"],
];
const nameOf = (e: { title?: string; company?: string; name?: string }) => e.name ?? `${e.title}, ${e.company}`;

type Props = { kb: KnowledgeBase; requirement: string; keyword: string; keywords: string[]; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: (entry: string) => void };

export function AddEvidenceDialog({ kb, requirement, keyword, keywords, open, onOpenChange, onSaved }: Props) {
  const owners = GROUPS.flatMap(([type]) => (kb[type] ?? []).map((e) => ({ type, e })));
  const [owner, setOwner] = useState(owners[0]?.e.id ?? "");
  const [text, setText] = useState("");
  const [metric, setMetric] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  async function save() {
    const what = text.trim();
    if (!what) {
      setError("Describe what you did");
      return box.current?.focus();
    }
    const target = owners.find((o) => o.e.id === owner);
    if (!target) return;
    setSaving(true);
    try {
      const fresh: KnowledgeBase = await (await fetch("/api/kb")).json(); // the latest highlights, so none are lost
      const entry = fresh[target.type]?.find((e) => e.id === owner);
      if (!entry) throw new Error("gone");
      const highlight = { text: what, metric: metric.trim() || undefined, skills: [...new Set([keyword, ...matchedKeywords(what, keywords)])], evidenceFor: requirement };
      const res = await fetch(`/api/kb/${target.type}/${owner}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ highlights: [...entry.highlights, highlight] }) });
      if (!res.ok) throw new Error(String(res.status));
      const label = nameOf(target.e);
      toast(`Added to ${label}`);
      onOpenChange(false);
      setText("");
      setMetric("");
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
        {owners.length ? (
          <>
            <DialogBody className="flex flex-col gap-3">
              <p>
                The job asks for <strong>{requirement}</strong>.
              </p>
              <Callout>
                <Info aria-hidden />
                <div>Only add it if it&apos;s true. It&apos;s saved as a highlight, so every future resume can use it.</div>
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
                </NativeSelect>
              </Field>
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
          </>
        ) : (
          <>
            <DialogBody>
              <p>Add a role, volunteer role or portfolio item first. Highlights belong to one of those.</p>
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Link href="/kb/roles" className={buttonVariants()}>
                Open knowledge base
              </Link>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
