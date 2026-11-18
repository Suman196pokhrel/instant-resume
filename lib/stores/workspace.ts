import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import { toast } from "@/lib/toast";

// The Workspace store (SPEC §3, §14.5): one per open project. Every change updates the documents at once (the preview
// follows) and saves through the API, debounced. Undo, proposals and revision viewing join with their cards.

export type Kind = ResumeDocument["kind"];
export type SaveState = "saved" | "saving" | "error";
type State = {
  kind: Kind;
  selected: string | null; // section ID
  zoom: number | null; // null = fit to width
  docs: Partial<Record<Kind, ResumeDocument>>;
  save: SaveState;
  setKind: (kind: Kind) => void;
  select: (id: string | null) => void;
  setZoom: (zoom: number | null) => void;
  /** A hand edit to one section of the current document: applied now, saved soon after. */
  editSection: (id: string, change: (s: Section) => Section, heading?: boolean) => void;
  flush: () => void;
};

export const SAVE_DELAY = 800;

export function createWorkspaceStore(docs: ResumeDocument[]): StoreApi<State> {
  const timers = new Map<Kind, ReturnType<typeof setTimeout>>();
  const labels = new Map<Kind, { label: string; coalesceKey: string }>();
  let inflight = 0;

  return createStore<State>()((set, get) => {
    async function save(kind: Kind, keepalive = false) {
      timers.delete(kind);
      const doc = get().docs[kind];
      const revision = labels.get(kind);
      if (!doc || !revision) return;
      inflight++;
      try {
        const res = await fetch(`/api/documents/${doc.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ theme: doc.theme, sections: doc.sections, recipient: doc.recipient, revision: { kind: "edit", ...revision } }),
          keepalive,
        });
        if (!res.ok) throw new Error(String(res.status));
        if (--inflight === 0 && !timers.size) set({ save: "saved" });
      } catch {
        inflight--;
        set({ save: "error" });
        toast("Couldn't save your changes. They'll be saved with your next change.", { kind: "error" });
      }
    }

    return {
      kind: "resume",
      selected: null,
      zoom: null,
      docs: Object.fromEntries(docs.map((d) => [d.kind, d])),
      save: "saved",
      setKind: (kind) => set({ kind, selected: null }),
      select: (selected) => set({ selected }),
      setZoom: (zoom) => set({ zoom }),
      editSection: (id, change, heading = false) => {
        const { kind, docs } = get();
        const doc = docs[kind];
        if (!doc) return;
        const sections = doc.sections.map((s) => (s.id === id ? change(s) : s));
        const title = sections.find((s) => s.id === id)?.title ?? "";
        set({ docs: { ...docs, [kind]: { ...doc, sections } }, save: "saving" });
        labels.set(kind, heading ? { label: `Edited ${title} heading`, coalesceKey: `title-${id}` } : { label: `Edited ${title}`, coalesceKey: `edit-${id}` }); // coalescing within 60 s is TASK-19
        clearTimeout(timers.get(kind));
        timers.set(kind, setTimeout(() => void save(kind), SAVE_DELAY));
      },
      /** Sends pending saves now (leaving the page). */
      flush: () => {
        for (const [kind, t] of timers) {
          clearTimeout(t);
          void save(kind, true);
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
