"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { KB_SECTIONS, type KbSection } from "@/lib/schemas/kb-fields";
import { toast } from "@/lib/toast";
import { EntryFields, readEntry, type Entry } from "./EntryForm";

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

/** Add or edit one knowledge base entry (SPEC §13.2, mock Views.kb openEditor). */
export function EntryDialog({ section, entry, trigger }: { section: KbSection; entry?: Entry & { id: string }; trigger: React.ReactElement }) {
  const def = KB_SECTIONS[section];
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const deleted = useRef(false);
  const isNew = !entry;

  const onOpenChange = (next: boolean) => {
    if (next) setErrors({});
    setOpen(next);
  };

  const done = (message: string) => {
    setOpen(false);
    router.refresh();
    toast(message);
  };

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { errors: found, entry: body } = readEntry(e.currentTarget, section);
    setErrors(found);
    if (!body) return;
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
    const gone = entry!;
    setBusy(true);
    const res = await send("DELETE", `/api/kb/${section}/${gone.id}`);
    setBusy(false);
    if (!res.ok) return toast("Couldn't delete. Try again.", { kind: "error" });
    deleted.current = true;
    setOpen(false);
    router.refresh();
    // Undo puts it back in place with the same entry and highlight IDs, so documents that cite them stay sourced.
    const undo = async () => {
      const back = await send("POST", `/api/kb/${section}?at=${res.data?.index ?? ""}`, gone);
      if (!back.ok) return toast("Couldn't restore the entry. Try again.", { kind: "error" });
      router.refresh();
      toast("Entry restored");
    };
    toast("Entry deleted", { action: { label: "Undo", onClick: () => void undo() } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      {/* After a delete the trigger's card is gone, so focus goes to the section's Add button instead of <body>. */}
      <DialogContent size={def.highlights ? "wide" : "default"} finalFocus={() => (deleted.current && document.querySelector<HTMLElement>("[data-kb-add]")) || true}>
        <DialogHeader>
          <DialogTitle>{`${isNew ? "Add" : "Edit"} ${def.noun}`}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id={formId} noValidate onSubmit={save}>
            <EntryFields section={section} entry={entry} errors={errors} idPrefix={formId} />
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
