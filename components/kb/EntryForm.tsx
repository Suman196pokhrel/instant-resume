"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { HIGHLIGHT_COPY, KB_SECTIONS, toEntry, toValues, validateFields, type FormValues, type KbSection } from "@/lib/schemas/kb-fields";
import type { Highlight } from "@/lib/schemas/kb";

// One knowledge base entry's fields and highlights editor (SPEC §13.2, §14.1), shared by the KB dialog and the
// onboarding wizard. Each highlight row carries its original highlight (id, skills, evidenceFor) in a hidden input,
// so readEntry gives back every one of them: bullets reference highlight IDs, so nothing may be dropped.

export type Entry = Record<string, unknown> & { id?: string; highlights?: Highlight[] };

/** The fields grid, plus the highlights editor for sections that have highlights. Remount (key) to reset it. */
export function EntryFields({ section, entry, errors, idPrefix }: { section: KbSection; entry?: Entry; errors: Record<string, string>; idPrefix: string }) {
  const def = KB_SECTIONS[section];
  const values = toValues(section, entry);
  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 max-[900px]:grid-cols-1">
        {def.fields.map((f) => (
          <Field key={f.k} id={`${idPrefix}-${f.k}`} label={f.label} optional={!f.req} error={errors[f.k]} className={f.wide ? "col-span-full" : undefined}>
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
      {def.highlights && <HighlightsEditor initial={entry?.highlights ?? []} />}
    </>
  );
}

type Row = { key: string; h?: Highlight };
const newRow = (h?: Highlight): Row => ({ key: crypto.randomUUID(), h });

function HighlightsEditor({ initial }: { initial: Highlight[] }) {
  const [rows, setRows] = useState<Row[]>(() => (initial.length ? initial.map(newRow) : [newRow()]));
  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    const editor = e.currentTarget.parentElement;
    setRows((r) => [...r, newRow()]);
    requestAnimationFrame(() => [...(editor?.querySelectorAll<HTMLElement>("[name=hl-text]") ?? [])].at(-1)?.focus());
  };
  const remove = (key: string) => setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== key) : [newRow()]));
  return (
    <div className="mt-[18px] flex flex-col gap-2.5 border-t border-line pt-3.5">
      <div className="flex flex-col gap-0.5">
        <strong>Highlights</strong>
        <span className="text-[13px] text-muted-foreground">{HIGHLIGHT_COPY.help}</span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={row.key} className="grid grid-cols-[1fr_170px_30px] items-start gap-2 max-[900px]:grid-cols-[1fr_30px]">
            <input type="hidden" name="hl-orig" value={row.h ? JSON.stringify(row.h) : ""} />
            <Textarea name="hl-text" rows={2} aria-label={`Highlight ${i + 1}`} defaultValue={row.h?.text} placeholder={HIGHLIGHT_COPY.text} />
            <Input name="hl-metric" aria-label={`Metric for highlight ${i + 1}`} defaultValue={row.h?.metric} placeholder={HIGHLIGHT_COPY.metric} className="max-[900px]:col-start-1" />
            <Button type="button" size="icon" aria-label={`Remove highlight ${i + 1}`} onClick={() => remove(row.key)} className="max-[900px]:col-start-2 max-[900px]:row-start-1">
              <Trash2 className="size-[15px]" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={add}>
        <Plus className="size-3.5" /> Add highlight
      </Button>
    </div>
  );
}

/** True when the user has typed or chosen anything in the form. */
export const formHasContent = (form: HTMLFormElement) =>
  [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input:not([type=hidden]), textarea, select")].some((el) => el.value.trim());

/**
 * Reads and checks the form. Invalid: returns the errors and focuses the first invalid field. Valid: returns the
 * entry fields; new highlight rows have no id (the server gives them one) and empty rows are dropped.
 */
export function readEntry(form: HTMLFormElement, section: KbSection): { errors: Record<string, string>; entry?: Record<string, unknown> } {
  const def = KB_SECTIONS[section];
  const fd = new FormData(form);
  const values: FormValues = Object.fromEntries(def.fields.map((f) => [f.k, String(fd.get(f.k) ?? "")]));
  const errors = validateFields(section, values);
  const first = def.fields.find((f) => errors[f.k]);
  if (first) {
    (form.elements.namedItem(first.k) as HTMLElement | null)?.focus();
    return { errors };
  }
  const entry: Record<string, unknown> = toEntry(section, values);
  if (def.highlights) {
    const [texts, metrics, origs] = ["hl-text", "hl-metric", "hl-orig"].map((n) => fd.getAll(n).map(String));
    entry.highlights = texts.flatMap((t, i) => {
      const text = t.trim();
      return text ? [{ ...(origs[i] ? (JSON.parse(origs[i]) as Highlight) : { skills: [] }), text, metric: metrics[i].trim() }] : [];
    });
  }
  return { errors, entry };
}
