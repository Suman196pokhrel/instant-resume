import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { Op } from "@/lib/patch/validate";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import type { Revision } from "@/lib/schemas/project";
import { THEME_DEFAULTS, type Theme } from "@/lib/schemas/theme";
import { clockTime } from "@/lib/time";
import { toast } from "@/lib/toast";

// The Workspace store (SPEC §3, §14.5): one per open project. Every change updates the documents at once (the preview
// follows) and saves through the API, debounced. A rewrite proposal stays out of the documents until it is accepted.
// Undo and revision viewing join with their cards.

export type Kind = ResumeDocument["kind"];
export type SaveState = "saved" | "saving" | "error";
export type UndoStep = { label: string; doc: ResumeDocument }; // the document before the change
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
  /** Structure tab: move a section of the current document to index `to`; a drag names no direction. */
  moveSection: (id: string, to: number, drag?: boolean) => void;
  toggleHidden: (id: string) => void;
  /** Design tab: change the current document's theme now; saved debounced as one "Adjusted design". */
  setTheme: (patch: Partial<Theme>) => void;
  resetTheme: () => void;
  renderMs: number | null; // the preview's last render, for the Design tab footer
  undoStack: Record<Kind, UndoStep[]>;
  /** Restores the current document to before its latest step and saves that as "Undid: {label}". */
  undo: (kind?: Kind) => void; // a toast's Undo names its document
  setRenderMs: (ms: number) => void;
  flush: () => void;
  /** Job panel (TASK-45): the application's notes, saved to the project after a pause. */
  notes: string;
  setNotes: (notes: string) => void;
  leftOpen: boolean | null; // null = the CSS default (open from 1180px wide)
  toggleLeft: (shown: boolean) => void;
  regenerating: boolean;
  setRegenerating: (on: boolean) => void;
  /** Replaces both documents with a fresh generation, keeping each theme; one revision and undo step each. */
  regenerate: (out: Record<Kind, Pick<ResumeDocument, "sections" | "recipient">>) => void;
  /** Checks (TASK-21): the left and inspector tabs, and a jump from a finding to its section. */
  leftTab: "job" | "checks";
  setLeftTab: (tab: "job" | "checks") => void;
  tab: InspectorTab;
  setTab: (tab: InspectorTab) => void;
  jump: { prefill?: string } | null; // one shot: the inspector focuses the section, or the instruction box with a prefill
  goTo: (sectionId: string, prefill?: string) => void;
  clearJump: () => void;
  /** History (TASK-22): an older revision shown in the preview, with the inspector locked. */
  viewing: Revision | null;
  view: (rev: Revision | null) => void;
  /** Copies the viewed revision into its document as a new restore revision; later revisions stay. */
  restore: () => void;
};
export type InspectorTab = "content" | "structure" | "design";

export const SAVE_DELAY = 800;
export const UNDO_LIMIT = 50;
export const BURST_IDLE = 1500; // typing or dragging with pauses shorter than this is one undo step
type RevisionIn = Pick<Revision, "kind" | "label" | "coalesceKey">;

export function createWorkspaceStore(docs: ResumeDocument[], project?: { id: string; notes?: string }): StoreApi<State> {
  const timers = new Map<Kind, ReturnType<typeof setTimeout>>();
  let notesTimer: ReturnType<typeof setTimeout> | undefined;
  const labels = new Map<Kind, RevisionIn>();
  let inflight = 0;
  let queue = Promise.resolve(); // saves go out in order, so an older snapshot never lands last
  const bursts = new Map<Kind, { key: string; at: number }>();

  return createStore<State>()((set, get) => {
    function save(kind: Kind, keepalive = false) {
      timers.delete(kind);
      const doc = get().docs[kind];
      const revision = labels.get(kind);
      if (!doc || !revision) return;
      send(`/api/documents/${doc.id}`, "PUT", { theme: doc.theme, sections: doc.sections, recipient: doc.recipient, revision }, keepalive);
    }
    function saveNotes(keepalive = false) {
      notesTimer = undefined;
      if (project) send(`/api/projects/${project.id}`, "PATCH", { notes: get().notes }, keepalive);
    }
    function send(url: string, method: string, data: unknown, keepalive: boolean) {
      inflight++;
      const body = JSON.stringify(data);
      const go = async () => {
        try {
          const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body, keepalive });
          if (!res.ok) throw new Error(String(res.status));
          if (--inflight === 0 && !timers.size && !notesTimer) set({ save: "saved" });
        } catch {
          inflight--;
          set({ save: "error" });
          toast("Couldn't save your changes. They'll be saved with your next change.", { kind: "error" });
        }
      };
      if (keepalive) void go(); // the page is going: no waiting behind earlier saves
      else queue = queue.then(go);
    }
    function pushUndo(kind: Kind, doc: ResumeDocument, label: string) {
      const stack = [...get().undoStack[kind], { label, doc }].slice(-UNDO_LIMIT);
      set({ undoStack: { ...get().undoStack, [kind]: stack } });
    }
    /** Sends the save still waiting for this document now, under its own revision. */
    function sendWaiting(kind: Kind) {
      if (!timers.has(kind)) return;
      clearTimeout(timers.get(kind));
      save(kind);
    }
    /** A change saved at once with its own revision and undo step; a hand edit still waiting goes first with its own. */
    function commit(kind: Kind, change: Partial<ResumeDocument>, revision: RevisionIn, undoable = true) {
      const doc = get().docs[kind];
      if (!doc) return;
      sendWaiting(kind);
      bursts.delete(kind);
      if (undoable) pushUndo(kind, doc, revision.label);
      set({ docs: { ...get().docs, [kind]: { ...doc, ...change } }, save: "saving" });
      labels.set(kind, revision);
      save(kind);
    }
    /** A change applied now and saved after a pause, so a burst (typing, dragging a slider) is one save. */
    function later(kind: Kind, change: Partial<ResumeDocument>, revision: RevisionIn & { coalesceKey: string }) {
      const doc = get().docs[kind];
      if (!doc) return;
      if (labels.get(kind)?.coalesceKey !== revision.coalesceKey) sendWaiting(kind); // each change keeps its own revision
      const burst = bursts.get(kind);
      if (burst?.key !== revision.coalesceKey || Date.now() - burst.at > BURST_IDLE) pushUndo(kind, doc, revision.label);
      bursts.set(kind, { key: revision.coalesceKey, at: Date.now() });
      set({ docs: { ...get().docs, [kind]: { ...doc, ...change } }, save: "saving" });
      labels.set(kind, revision);
      clearTimeout(timers.get(kind));
      timers.set(kind, setTimeout(() => save(kind), SAVE_DELAY));
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
      setKind: (kind) => set({ kind, selected: null, viewing: null, ...drop() }),
      select: (selected) => set({ selected, ...drop() }),
      setZoom: (zoom) => set({ zoom }),
      editSection: (id, change, heading = false) => {
        const { kind, docs } = get();
        const doc = docs[kind];
        if (!doc) return;
        const sections = doc.sections.map((s) => (s.id === id ? change(s) : s));
        const title = sections.find((s) => s.id === id)?.title ?? "";
        later(kind, { sections }, heading ? { kind: "edit", label: `Edited ${title} heading`, coalesceKey: `title-${id}` } : { kind: "edit", label: `Edited ${title}`, coalesceKey: `edit-${id}` }); // coalescing within 60 s is TASK-19
      },
      setBusy: (busy) => set({ busy }),
      propose: (pending) => set({ pending, busy: null }),
      accept: () => {
        const { pending: p, docs } = get();
        const doc = p && docs[p.kind];
        if (!p || !doc) return;
        set({ pending: null });
        commit(p.kind, { sections: doc.sections.map((s) => (s.id === p.sectionId ? { ...p.after, hidden: s.hidden } : s)) /* hidden may have changed in Structure meanwhile */ }, { kind: "rewrite", label: `Rewrote ${p.before.title}: "${p.instruction}"` });
      },
      reject: () => set({ pending: null }),
      moveSection: (id, to, drag = false) => {
        const { kind, docs } = get();
        const sections = [...(docs[kind]?.sections ?? [])];
        const from = sections.findIndex((s) => s.id === id);
        if (from < 0 || to === from || to < 0 || to >= sections.length) return;
        const [moved] = sections.splice(from, 1);
        sections.splice(to, 0, moved);
        commit(kind, { sections }, { kind: "structure", label: `Moved ${moved.title}${drag ? "" : to < from ? " up" : " down"}` });
      },
      toggleHidden: (id) => {
        const { kind, docs } = get();
        const s = docs[kind]?.sections.find((x) => x.id === id);
        if (!s) return;
        commit(kind, { sections: docs[kind]!.sections.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)) }, { kind: "structure", label: `${s.hidden ? "Showed" : "Hid"} ${s.title}` });
      },
      setTheme: (patch) => {
        const { kind, docs } = get();
        const doc = docs[kind];
        if (doc) later(kind, { theme: { ...doc.theme, ...patch } }, { kind: "adjustment", label: "Adjusted design", coalesceKey: "design" });
      },
      resetTheme: () => commit(get().kind, { theme: THEME_DEFAULTS }, { kind: "adjustment", label: "Reset design to template defaults" }),
      renderMs: null,
      setRenderMs: (renderMs) => set({ renderMs }),
      undoStack: { resume: [], coverLetter: [] },
      undo: (which) => {
        const { undoStack, selected } = get();
        if (get().viewing) return; // restore or go back to current first
        const kind = which ?? get().kind;
        const step = undoStack[kind].at(-1);
        if (!step) return;
        const label = `Undid: ${step.label}`;
        const here = kind === get().kind;
        set({ undoStack: { ...undoStack, [kind]: undoStack[kind].slice(0, -1) }, ...(here ? { ...drop(), selected: step.doc.sections.some((s) => s.id === selected) ? selected : null } : {}) });
        commit(kind, { sections: step.doc.sections, theme: step.doc.theme, recipient: step.doc.recipient }, { kind: "restore", label }, false);
        toast(label);
      },
      /** Sends pending saves now (leaving the page). */
      flush: () => {
        for (const [kind, t] of timers) {
          clearTimeout(t);
          save(kind, true);
        }
        if (notesTimer) {
          clearTimeout(notesTimer);
          saveNotes(true);
        }
      },
      notes: project?.notes ?? "",
      setNotes: (notes) => {
        set({ notes, save: "saving" });
        clearTimeout(notesTimer);
        notesTimer = setTimeout(() => saveNotes(), SAVE_DELAY);
      },
      leftOpen: null,
      toggleLeft: (shown) => set({ leftOpen: !shown }),
      leftTab: "job",
      setLeftTab: (leftTab) => set({ leftTab }),
      tab: "content",
      setTab: (tab) => set({ tab }),
      jump: null,
      goTo: (selected, prefill) => set({ selected, tab: "content", jump: prefill ? { prefill } : {}, ...drop() }),
      clearJump: () => set({ jump: null }),
      viewing: null,
      view: (viewing) => set({ viewing, ...drop() }),
      restore: () => {
        const { viewing: r, kind } = get();
        if (!r) return;
        set({ viewing: null, selected: null });
        commit(kind, { sections: r.snapshot.sections, theme: r.snapshot.theme, recipient: r.snapshot.recipient }, { kind: "restore", label: `Restored the version from ${clockTime(r.ts)}` });
        toast("Restored. The version you replaced is still in history.");
      },
      regenerating: false,
      setRegenerating: (regenerating) => set({ regenerating }),
      regenerate: (out) => {
        set({ selected: null, pending: null, busy: null, regenerating: false, viewing: null });
        for (const kind of ["resume", "coverLetter"] as const) commit(kind, { sections: out[kind].sections, recipient: out[kind].recipient }, { kind: "generation", label: "Regenerated from job brief" });
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
