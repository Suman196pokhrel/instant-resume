"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";

/** Settings → Your data: delete the whole knowledge base after a confirm (owner's request). Applications stay. */
export function WipeKb() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function wipe() {
    setBusy(true);
    const res = await fetch("/api/kb", { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast("Couldn't delete the knowledge base. Try again.", { kind: "error" });
    setOpen(false);
    toast("Knowledge base deleted");
    router.push("/onboarding");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="danger-ghost" onClick={() => setOpen(true)}>
        <Trash2 /> Delete knowledge base
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your knowledge base?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>Every entry goes: contact, experience, skills and the rest. Your applications stay. Export a backup first if you might want it back.</DialogDescription>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button variant="danger-ghost" onClick={wipe} disabled={busy}>
            Delete knowledge base
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
