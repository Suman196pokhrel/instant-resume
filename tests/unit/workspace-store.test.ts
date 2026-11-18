import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspaceStore, SAVE_DELAY, type Proposal } from "@/lib/stores/workspace";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";

// The Workspace store around a rewrite (SPEC §14.5; TASK-16): saves go out in order, Accept keeps a pending hand
// edit's own revision, and leaving a section cancels the rewrite.
vi.mock("@/lib/toast", () => ({ toast: vi.fn() }));

const summary: Section = { id: "s-sum", kind: "summary", title: "Summary", hidden: false, text: "Old." };
const other: Section = { id: "s-exp", kind: "experience", title: "Experience", hidden: false, items: [] };
const resume: ResumeDocument = { id: "d-1", projectId: "p-1", kind: "resume", theme: THEME_DEFAULTS, sections: [summary, other] };
const letter: ResumeDocument = { ...resume, id: "d-2", kind: "coverLetter", sections: [] };
const proposal = (over: Partial<Proposal> = {}): Proposal => ({ sectionId: "s-sum", kind: "resume", before: summary, after: { ...summary, text: "New." }, instruction: "More concise", ops: [], warnings: [], ...over });

let bodies: { sections: Section[]; revision: { kind: string; label: string } }[];
let release: (() => void)[];
beforeEach(() => {
  vi.useFakeTimers();
  bodies = [];
  release = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string));
      return new Promise((resolve) => release.push(() => resolve({ ok: true })));
    })
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const settle = () => vi.advanceTimersByTimeAsync(0);

describe("workspace store: rewrite", () => {
  it("Accept sends a pending hand edit first with its own revision, then the rewrite, one after the other", async () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().editSection("s-exp", (s) => ({ ...s, title: "Work" }), true);
    store.getState().propose(proposal());
    store.getState().accept();
    await settle();
    expect(bodies.map((b) => b.revision)).toEqual([{ kind: "edit", label: "Edited Work heading", coalesceKey: "title-s-exp" }]); // the rewrite waits for it
    release.shift()!();
    await settle();
    expect(bodies[1].revision).toEqual({ kind: "rewrite", label: 'Rewrote Summary: "More concise"' });
    expect(bodies[1].sections[0]).toMatchObject({ text: "New." });
    expect(bodies[1].sections[1]).toMatchObject({ title: "Work" });
    release.shift()!();
    await settle();
    expect(store.getState().save).toBe("saved");
    await vi.advanceTimersByTimeAsync(SAVE_DELAY * 2);
    expect(bodies).toHaveLength(2); // the edit's debounce was cleared, not sent again
  });

  it("Reject applies and saves nothing", async () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().propose(proposal());
    store.getState().reject();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY * 2);
    expect(bodies).toHaveLength(0);
    expect(store.getState().docs.resume!.sections[0]).toEqual(summary);
    expect(store.getState().pending).toBeNull();
  });

  it.each([
    ["choosing another section", (s: ReturnType<typeof createWorkspaceStore>) => s.getState().select("s-exp")],
    ["switching document", (s: ReturnType<typeof createWorkspaceStore>) => s.getState().setKind("coverLetter")],
  ])("%s aborts a running rewrite and drops a proposal", (_name, leave) => {
    const store = createWorkspaceStore([resume, letter]);
    const controller = new AbortController();
    store.getState().setBusy(controller);
    leave(store);
    expect(controller.signal.aborted).toBe(true);
    expect(store.getState().busy).toBeNull();
    store.getState().propose(proposal());
    leave(store);
    expect(store.getState().pending).toBeNull();
  });
});
