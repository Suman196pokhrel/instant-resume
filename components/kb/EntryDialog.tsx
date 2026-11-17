"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { HIGHLIGHT_COPY, KB_SECTIONS, toEntry, toValues, validateFields, type FormValues, type KbSection } from "@/lib/schemas/kb-fields";
import type { Highlight } from "@/lib/schemas/kb";
import { toast } from "@/lib/toast";

type Entry = Record<string, unknown> & { id: string; highlights?: Highlight[] };
type Row = { key: string; h?: Highlight };

const SINGLE_URL: Partial<Record<KbSection, string>> = { contact: "/api/kb/contact", workRights: "/api/kb/work-rights" };

/** Calls a KB route; a network failure comes back as not ok, so the dialog never stays stuck as busy. */
async function send(method: string, url: string, body?: unknown) {
  try {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

/**
 * Add or edit one knowledge base entry (SPEC §13.2, mock Views.kb openEditor). Highlights keep their id, skills and
 * evidenceFor: PATCH replaces the whole array and bullets reference highlight IDs, so nothing may be dropped.
 */
export function EntryDialog({ section, entry, trigger }: { section: KbSection; entry?: Entry; trigger: React.ReactElement }) {
  const def = KB_SECTIONS[section];
  const router = useRouter();
  const formId = useId();
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const deleted = useRef(false);
  const isNew = !entry;

  const onOpenChange = (next: boolean) => {
    if (next) {
      setErrors({});
      const hl = entry?.highlights ?? [];
      setRows((hl.length ? hl : [undefined]).map((h) => ({ key: crypto.randomUUID(), h })));
    }
    setOpen(next);
  };

  const done = (message: string) => {
    setOpen(false);
    router.refresh();
    toast(message);
  };

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: FormValues = Object.fromEntries(def.fields.map((f) => [f.k, String(fd.get(f.k) ?? "")]));
    const found = validateFields(section, values);
    setErrors(found);
    const first = def.fields.find((f) => found[f.k]);
    if (first) return (e.currentTarget.elements.namedItem(first.k) as HTMLElement).focus();

    const body: Record<string, unknown> = toEntry(section, values);
    if (def.highlights) {
      const texts = fd.getAll("hl-text").map(String);
      const metrics = fd.getAll("hl-metric").map(String);
      body.highlights = rows.flatMap((row, i) => {
        const text = texts[i].trim();
        return text ? [{ ...(row.h ?? { skills: [] }), text, metric: metrics[i].trim() }] : []; // new rows get an id on the server
      });
    }
    setBusy(true);
    const url = SINGLE_URL[section];
    const res = url
      ? await send("PUT", url, body)
      : isNew
        ? await send("POST", `/api/kb/${section}`, body)
        : await send("PATCH", `/api/kb/${section}/${entry.id}`, body);
    setBusy(false);
    if (res.ok) return done("Saved to knowledge base");
    // A 422 names fields by path ("roles.2.title"); show the ones this form has.
    const issues: { path: string; message: string }[] = res.data?.issues ?? [];
    const fieldErrors = Object.fromEntries(issues.map((i) => [i.path.split(".").at(-1)!, i.message]).filter(([k]) => def.fields.some((f) => f.k === k)));
    setErrors(fieldErrors);
    toast(Object.keys(fieldErrors).length ? "Couldn't save. Check the fields and try again." : "Couldn't save your changes. Try again.", { kind: "error" });
  }

  async function remove() {
    setBusy(true);
    const res = await send("DELETE", `/api/kb/${section}/${entry!.id}`);
    setBusy(false);
    if (!res.ok) return toast("Couldn't delete. Try again.", { kind: "error" });
    deleted.current = true;
    done("Entry deleted");
  }

  const addRow = () => {
    setRows((r) => [...r, { key: crypto.randomUUID() }]);
    requestAnimationFrame(() => [...(form.current?.querySelectorAll<HTMLElement>("[name=hl-text]") ?? [])].at(-1)?.focus());
  };
  const removeRow = (key: string) => setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== key) : [{ key: crypto.randomUUID() }]));

  const values = toValues(section, entry);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent size={def.highlights ? "wide" : "default"} finalFocus={() => (deleted.current && document.querySelector<HTMLElement>("[data-kb-add]")) || true}>
        <DialogHeader>
          <DialogTitle>{`${isNew ? "Add" : "Edit"} ${def.noun}`}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id={formId} ref={form} noValidate onSubmit={save}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 max-[900px]:grid-cols-1">
              {def.fields.map((f) => (
                <Field key={f.k} id={`${formId}-${f.k}`} label={f.label} optional={!f.req} error={errors[f.k]} className={f.wide ? "col-span-full" : undefined}>
                  {f.type === "select" ? (
                    <NativeSelect name={f.k} defaultValue={values[f.k]}>
                      <option value="">Choose…</option>
                      {f.options!.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </NativeSelect>
                  ) : f.type === "textarea" ? (
                    <Textarea name={f.k} rows={6} defaultValue={values[f.k]} />
                  ) : (
                    <Input name={f.k} type={f.type ?? "text"} defaultValue={values[f.k]} placeholder={f.ph} />
                  )}
                </Field>
              ))}
            </div>
            {def.highlights && (
              <div className="mt-[18px] flex flex-col gap-2.5 border-t border-line pt-3.5">
                <div className="flex flex-col gap-0.5">
                  <strong>Highlights</strong>
                  <span className="text-[13px] text-muted-foreground">{HIGHLIGHT_COPY.help}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {rows.map((row, i) => (
                    <div key={row.key} className="grid grid-cols-[1fr_170px_30px] items-start gap-2 max-[900px]:grid-cols-[1fr_30px]">
                      <Textarea
                        name="hl-text"
                        rows={2}
                        aria-label={`Highlight ${i + 1}`}
                        defaultValue={row.h?.text}
                        placeholder={HIGHLIGHT_COPY.text}
                      />
                      <Input
                        name="hl-metric"
                        aria-label={`Metric for highlight ${i + 1}`}
                        defaultValue={row.h?.metric}
                        placeholder={HIGHLIGHT_COPY.metric}
                        className="max-[900px]:col-start-1"
                      />
                      <Button type="button" size="icon" aria-label={`Remove highlight ${i + 1}`} onClick={() => removeRow(row.key)} className="max-[900px]:col-start-2 max-[900px]:row-start-1">
                        <Trash2 className="size-[15px]" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={addRow}>
                  <Plus className="size-3.5" /> Add highlight
                </Button>
              </div>
            )}
          </form>
        </DialogBody>
        <DialogFooter>
          {!isNew && !def.single && (
            <Button variant="danger-ghost" disabled={busy} onClick={remove}>
              Delete
            </Button>
          )}
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button type="submit" form={formId} disabled={busy}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
