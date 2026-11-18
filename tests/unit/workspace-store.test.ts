import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspaceStore, SAVE_DELAY, type Proposal } from "@/lib/stores/workspace";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";

// The Workspace store around a rewrite (SPEC §14.5; TASK-16): saves go out in order, Accept keeps a pending hand
// edit's own revision, and leaving a section cancels the rewrite.
vi.mock("@/lib/toast", () => ({ toast: vi.fn() }));
import { toast } from "@/lib/toast";

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

describe("workspace store: structure (TASK-17)", () => {
  it("moveSection reorders and saves at once as a structure revision", async () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().moveSection("s-sum", 1);
    expect(store.getState().docs.resume!.sections.map((s) => s.id)).toEqual(["s-exp", "s-sum"]);
    await settle();
    expect(bodies[0].revision).toEqual({ kind: "structure", label: "Moved Summary down" });
    expect(bodies[0].sections.map((s) => s.id)).toEqual(["s-exp", "s-sum"]);
    store.getState().moveSection("s-sum", 0);
    release.shift()!();
    await settle();
    expect(bodies[1].revision.label).toBe("Moved Summary up");
    store.getState().moveSection("s-sum", 0); // already there: nothing to save
    release.shift()!();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY * 2);
    expect(bodies).toHaveLength(2);
  });

  it("a drag names no direction", async () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().moveSection("s-exp", 0, true);
    await settle();
    expect(bodies[0].revision.label).toBe("Moved Experience");
  });

  it("toggleHidden hides and shows, keeping the section", async () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().toggleHidden("s-exp");
    expect(store.getState().docs.resume!.sections[1]).toMatchObject({ id: "s-exp", hidden: true });
    await settle();
    store.getState().toggleHidden("s-exp");
    release.shift()!();
    await settle();
    expect(bodies.map((b) => b.revision.label)).toEqual(["Hid Experience", "Showed Experience"]);
    expect(store.getState().docs.resume!.sections[1].hidden).toBe(false);
  });

  it("accepting a proposal keeps a hide made in Structure meanwhile", () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().propose(proposal());
    store.getState().toggleHidden("s-sum");
    store.getState().accept();
    expect(store.getState().docs.resume!.sections[0]).toMatchObject({ text: "New.", hidden: true });
  });

  it("a pending hand edit is sent first with its own revision", async () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().editSection("s-sum", (s) => ({ ...s, title: "Profile" }), true);
    store.getState().toggleHidden("s-exp");
    await settle();
    release.shift()!();
    await settle();
    expect(bodies.map((b) => b.revision.kind)).toEqual(["edit", "structure"]);
    await vi.advanceTimersByTimeAsync(SAVE_DELAY * 2);
    expect(bodies).toHaveLength(2);
  });
});

describe("workspace store: design (TASK-18)", () => {
  it("setTheme applies at once and saves once after the debounce as Adjusted design", async () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().setTheme({ baseSize: 11 });
    store.getState().setTheme({ font: "Inter" });
    expect(store.getState().docs.resume!.theme).toMatchObject({ baseSize: 11, font: "Inter" });
    expect(store.getState().docs.coverLetter!.theme).toEqual(THEME_DEFAULTS); // each document has its own
    await settle();
    expect(bodies).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].revision).toEqual({ kind: "adjustment", label: "Adjusted design", coalesceKey: "design" });
  });

  it("resetTheme restores the defaults and saves at once", async () => {
    const store = createWorkspaceStore([{ ...resume, theme: { ...THEME_DEFAULTS, margin: 22 } }, letter]);
    store.getState().resetTheme();
    expect(store.getState().docs.resume!.theme).toEqual(THEME_DEFAULTS);
    await settle();
    expect(bodies[0].revision).toEqual({ kind: "adjustment", label: "Reset design to template defaults" });
  });
});

describe("workspace store: undo (TASK-19)", () => {
  const text = (store: ReturnType<typeof createWorkspaceStore>) => (store.getState().docs.resume!.sections[0] as { text: string }).text;
  const typeInSummary = (store: ReturnType<typeof createWorkspaceStore>, t: string) => store.getState().editSection("s-sum", (s) => ({ ...s, text: t }));
  const steps = (store: ReturnType<typeof createWorkspaceStore>, kind: "resume" | "coverLetter" = "resume") => store.getState().undoStack[kind].map((u) => u.label);

  it("a burst of typing is one step; a pause over 1.5 s starts another", async () => {
    const store = createWorkspaceStore([resume, letter]);
    typeInSummary(store, "A");
    await vi.advanceTimersByTimeAsync(500);
    typeInSummary(store, "AB");
    expect(steps(store)).toEqual(["Edited Summary"]);
    await vi.advanceTimersByTimeAsync(1600);
    typeInSummary(store, "ABC");
    expect(steps(store)).toEqual(["Edited Summary", "Edited Summary"]);
    expect(store.getState().undoStack.resume[1].doc.sections[0]).toMatchObject({ text: "AB" });
  });

  it("undo restores the document before the step, saves it as a restore and says so", async () => {
    const store = createWorkspaceStore([resume, letter]);
    typeInSummary(store, "Typed.");
    store.getState().undo();
    expect(text(store)).toBe("Old.");
    expect(steps(store)).toEqual([]);
    await settle();
    release.forEach((r) => r());
    await settle();
    release.forEach((r) => r());
    expect(bodies.map((b) => b.revision)).toEqual([
      { kind: "edit", label: "Edited Summary", coalesceKey: "edit-s-sum" },
      { kind: "restore", label: "Undid: Edited Summary" },
    ]);
    expect(bodies[1].sections[0]).toMatchObject({ text: "Old." });
    expect(toast).toHaveBeenCalledWith("Undid: Edited Summary");
  });

  it("rewrite Accept, structure changes and Reset each push a step", () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().propose(proposal());
    store.getState().accept();
    store.getState().moveSection("s-sum", 1);
    store.getState().toggleHidden("s-exp");
    store.getState().resetTheme();
    expect(steps(store)).toEqual(['Rewrote Summary: "More concise"', "Moved Summary down", "Hid Experience", "Reset design to template defaults"]);
    store.getState().undo();
    store.getState().undo();
    store.getState().undo();
    expect(store.getState().docs.resume!.sections.map((s) => s.id)).toEqual(["s-sum", "s-exp"]);
    store.getState().undo();
    expect(text(store)).toBe("Old.");
  });

  it("the stack keeps the last 50 steps", () => {
    const store = createWorkspaceStore([resume, letter]);
    for (let i = 0; i < 51; i++) store.getState().moveSection("s-sum", i % 2 === 0 ? 1 : 0);
    expect(steps(store)).toHaveLength(50);
    for (let i = 0; i < 50; i++) store.getState().undo();
    expect(steps(store)).toHaveLength(0);
    expect(store.getState().docs.resume!.sections.map((s) => s.id)).toEqual(["s-exp", "s-sum"]); // the state after the first, dropped move
    store.getState().undo(); // nothing left: no change
    expect(store.getState().docs.resume!.sections.map((s) => s.id)).toEqual(["s-exp", "s-sum"]);
  });

  it("each document has its own stack", () => {
    const store = createWorkspaceStore([resume, letter]);
    typeInSummary(store, "Typed.");
    store.getState().setKind("coverLetter");
    expect(steps(store, "coverLetter")).toEqual([]);
    store.getState().undo();
    expect(text(store)).toBe("Typed.");
  });

  it("a toast's Undo undoes its own document, even with the other one open", () => {
    const store = createWorkspaceStore([resume, letter]);
    typeInSummary(store, "Typed.");
    store.getState().setKind("coverLetter");
    store.getState().undo("resume");
    expect(text(store)).toBe("Old.");
    expect(store.getState().kind).toBe("coverLetter");
  });

  it("undo drops a pending proposal", () => {
    const store = createWorkspaceStore([resume, letter]);
    store.getState().moveSection("s-sum", 1);
    store.getState().propose(proposal());
    store.getState().undo();
    expect(store.getState().pending).toBeNull();
  });

  it("an edit then a design change within the debounce each keep their own revision", async () => {
    const store = createWorkspaceStore([resume, letter]);
    typeInSummary(store, "Typed.");
    store.getState().setTheme({ margin: 20 });
    await settle();
    release.forEach((r) => r());
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    expect(bodies.map((b) => b.revision.label)).toEqual(["Edited Summary", "Adjusted design"]);
  });
});
