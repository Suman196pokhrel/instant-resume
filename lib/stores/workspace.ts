import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { Op } from "@/lib/patch/validate";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import type { Revision } from "@/lib/schemas/project";
import { toast } from "@/lib/toast";

// The Workspace store (SPEC §3, §14.5): one per open project. Every change updates the documents at once (the preview
// follows) and saves through the API, debounced. A rewrite proposal stays out of the documents until it is accepted.
// Undo and revision viewing join with their cards.

export type Kind = ResumeDocument["kind"];
export type SaveState = "saved" | "saving" | "error";
export type Proposal = { sectionId: string; kind: Kind; before: Section; after: Section; instruction: string; ops: Op[]; warnings: string[] };
type State = {
  kind: Kind;
  selected: string | null; // section ID
  zoom: number | null; // null = fit to width
  docs: Partial<Record<Kind, ResumeDocument>>;
  save: SaveState;
  busy: AbortController | null; // a rewrite in flight
  pending: Proposal | null;
  setKind: (kind: Kind) => void;
  select: (id: string | null) => void;
  setZoom: (zoom: number | null) => void;
  /** A hand edit to one section of the current document: applied now, saved soon after. */
  editSection: (id: string, change: (s: Section) => Section, heading?: boolean) => void;
  setBusy: (busy: AbortController | null) => void;
  propose: (p: Proposal) => void;
  /** Applies the proposal and saves it now as a rewrite revision. */
  accept: () => void;
  reject: () => void;
  flush: () => void;
};

export const SAVE_DELAY = 800;
type RevisionIn = Pick<Revision, "kind" | "label" | "coalesceKey">;

export function createWorkspaceStore(docs: ResumeDocument[]): StoreApi<State> {
  const timers = new Map<Kind, ReturnType<typeof setTimeout>>();
  const labels = new Map<Kind, RevisionIn>();
  let inflight = 0;
  let queue = Promise.resolve(); // saves go out in order, so an older snapshot never lands last

  return createStore<State>()((set, get) => {
    function save(kind: Kind, keepalive = false) {
      timers.delete(kind);
      const doc = get().docs[kind];
      const revision = labels.get(kind);
      if (!doc || !revision) return;
      inflight++;
      const body = JSON.stringify({ theme: doc.theme, sections: doc.sections, recipient: doc.recipient, revision });
      const send = async () => {
        try {
          const res = await fetch(`/api/documents/${doc.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body, keepalive });
          if (!res.ok) throw new Error(String(res.status));
          if (--inflight === 0 && !timers.size) set({ save: "saved" });
        } catch {
          inflight--;
          set({ save: "error" });
          toast("Couldn't save your changes. They'll be saved with your next change.", { kind: "error" });
        }
      };
      if (keepalive) void send(); // the page is going: no waiting behind earlier saves
      else queue = queue.then(send);
    }
    /** Leaving a section, a document or the page drops what the rewrite was for. */
    const drop = () => {
      get().busy?.abort();
      return { busy: null, pending: null };
    };

    return {
      kind: "resume",
      selected: null,
      zoom: null,
      docs: Object.fromEntries(docs.map((d) => [d.kind, d])),
      save: "saved",
      busy: null,
      pending: null,
      setKind: (kind) => set({ kind, selected: null, ...drop() }),
      select: (selected) => set({ selected, ...drop() }),
      setZoom: (zoom) => set({ zoom }),
      editSection: (id, change, heading = false) => {
        const { kind, docs } = get();
        const doc = docs[kind];
        if (!doc) return;
        const sections = doc.sections.map((s) => (s.id === id ? change(s) : s));
        const title = sections.find((s) => s.id === id)?.title ?? "";
        set({ docs: { ...docs, [kind]: { ...doc, sections } }, save: "saving" });
        labels.set(kind, heading ? { kind: "edit", label: `Edited ${title} heading`, coalesceKey: `title-${id}` } : { kind: "edit", label: `Edited ${title}`, coalesceKey: `edit-${id}` }); // coalescing within 60 s is TASK-19
        clearTimeout(timers.get(kind));
        timers.set(kind, setTimeout(() => save(kind), SAVE_DELAY));
      },
      setBusy: (busy) => set({ busy }),
      propose: (pending) => set({ pending, busy: null }),
      accept: () => {
        const { pending: p, docs } = get();
        const doc = p && docs[p.kind];
        if (!p || !doc) return;
        if (timers.has(p.kind)) {
          clearTimeout(timers.get(p.kind));
          save(p.kind); // the hand edit before it keeps its own revision
        }
        const sections = doc.sections.map((s) => (s.id === p.sectionId ? p.after : s));
        set({ docs: { ...docs, [p.kind]: { ...doc, sections } }, pending: null, save: "saving" });
        labels.set(p.kind, { kind: "rewrite", label: `Rewrote ${p.before.title}: "${p.instruction}"` });
        save(p.kind);
      },
      reject: () => set({ pending: null }),
      /** Sends pending saves now (leaving the page). */
      flush: () => {
        for (const [kind, t] of timers) {
          clearTimeout(t);
          save(kind, true);
        }
      },
    };
  });
}

export const WorkspaceContext = createContext<StoreApi<State> | null>(null);
export function useWorkspace<T>(selector: (s: State) => T): T {
  const store = useContext(WorkspaceContext);
  if (!store) throw new Error("useWorkspace outside a Workspace");
  return useStore(store, selector);
}
