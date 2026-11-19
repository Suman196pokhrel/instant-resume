import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/kb.json";
import { coverageFinding, createPipeline, type PipelineDeps, type PipelineEvent, type ProjectIn } from "@/lib/generate/pipeline";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { createMockAdapter, MOCK_FIXTURES } from "@/lib/llm/mock";
import { kbSchema } from "@/lib/schemas/kb";
import { prefsSchema } from "@/lib/schemas/settings";
import { THEME_PRESETS } from "@/lib/schemas/theme";

// SPEC §14.3 Quick generate pipeline, §18.1 Pipeline: an event emitter the UI only listens to (TASK-24).
const kb = kbSchema.parse(structuredClone(fixture));
const jdText = readFileSync("tests/fixtures/jds/mintleaf.txt", "utf8");

function setup(over: Partial<PipelineDeps> = {}, scenario: "happy" | "gaps" = "happy") {
  const calls: string[] = [];
  const prompts: Record<string, string> = {};
  const mock = createMockAdapter({ fixtures: MOCK_FIXTURES, scenario });
  const adapter: LlmAdapter = { generateObject: (args) => (calls.push(args.name), (prompts[args.name] = String(args.prompt)), mock.generateObject(args)) };
  const save = vi.fn<(project: ProjectIn, documents: { kind: string }[]) => Promise<string>>(async () => "p-new");
  const deps: PipelineDeps = { kb, prefs: prefsSchema.parse({}), getAdapter: async () => adapter, compile: async (kind) => (kind === "resume" ? 2 : 1), save, ...over };
  const p = createPipeline({ jdText, notes: "Referred by Dana" }, deps);
  const events: PipelineEvent[] = [];
  for (const type of ["stage", "progress", "brief", "match", "draft", "pages", "checks", "done", "error"] as const) p.on(type, (e) => events.push(e));
  return { p, events, calls, save, prompts };
}
const stages = (events: PipelineEvent[]) => events.flatMap((e) => (e.type === "stage" ? [`${e.id}:${e.status}`] : []));

describe("pipeline", () => {
  it("runs the 5 stages in order with live results and monotonic progress, and saves once at the end", async () => {
    const { p, events, calls, save } = setup();
    await p.run();
    expect(stages(events)).toEqual(["read:active", "read:done", "match:active", "match:done", "write:active", "write:done", "fit:active", "fit:done", "check:active", "check:done"]);
    expect(calls).toEqual(["brief", "match", "generate"]);
    const types = events.map((e) => e.type);
    for (const t of ["brief", "match", "draft", "pages", "checks"]) expect(types).toContain(t);
    expect(types.indexOf("brief")).toBeLessThan(types.indexOf("match"));
    const progress = events.flatMap((e) => (e.type === "progress" ? [e.value] : []));
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(progress.at(-1)).toBe(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]).toMatchObject([{ source: "quick", gaps: [], notes: "Referred by Dana", company: "Mintleaf" }, [{ kind: "resume" }, { kind: "coverLetter" }]]);
    expect(events.at(-1)).toMatchObject({ type: "done", projectId: "p-new" });
    expect(events.find((e) => e.type === "stage" && e.id === "fit" && e.status === "done")).toMatchObject({ note: "Resume 2 pages, cover letter 1 page" });
    expect(types.indexOf("done")).toBeGreaterThan(types.lastIndexOf("checks"));
  });

  it("warns at the match stage when must-haves have no evidence", async () => {
    const { p, events } = setup({}, "gaps");
    await p.run();
    expect(events.find((e) => e.type === "stage" && e.id === "match" && e.status !== "active")).toMatchObject({ status: "warning", note: "2 must-haves have no evidence in your knowledge base" });
    expect(events.find((e) => e.type === "match")).toMatchObject({ gaps: ["Payments or financial services experience", "Kubernetes in production"] });
  });

  it("cancel stops the run: no more events and nothing saved", async () => {
    let release!: () => void;
    const { p, events, save } = setup({ compile: () => new Promise((r) => (release = () => r(1))) });
    const running = p.run();
    await vi.waitFor(() => expect(stages(events)).toContain("fit:active"));
    p.cancel();
    const seen = events.length;
    release();
    await running;
    expect(events).toHaveLength(seen);
    expect(save).not.toHaveBeenCalled();
  });

  it("a failed stage reports its reason; Retry from it keeps the earlier results", async () => {
    const { p, events, calls, save } = setup({ failOnce: 2 });
    await p.run();
    expect(events.at(-1)).toMatchObject({ type: "error", index: 2, label: "Writing your resume and cover letter" });
    expect(stages(events).at(-1)).toBe("write:error");
    expect(save).not.toHaveBeenCalled();
    await p.run(2);
    expect(calls).toEqual(["brief", "match", "generate"]); // the brief and match weren't asked for again
    expect(events.at(-1)).toMatchObject({ type: "done" });
  });

  it("drops the cover letter when it's off in the settings", async () => {
    const { p, save } = setup({ prefs: prefsSchema.parse({ quick: { coverLetter: false } }) });
    await p.run();
    expect(save.mock.calls[0][1].map((d: { kind: string }) => d.kind)).toEqual(["resume"]);
    expect(save.mock.calls[0][0]).toMatchObject({ coverLetterOff: true });
  });

  it("applies the default theme preset to both documents and the tone to the writing (TASK-51)", async () => {
    const { p, save, prompts } = setup({ prefs: prefsSchema.parse({ quick: { theme: "modern", tone: "Warm" } }) });
    await p.run();
    for (const doc of save.mock.calls[0][1]) expect(doc).toMatchObject({ theme: { font: THEME_PRESETS.modern.font, accent: THEME_PRESETS.modern.accent } });
    expect(prompts.generate).toContain("Tone: Warm");
  });
});

describe("pipeline: page fit (TASK-25)", () => {
  it("fits the resume through the loop and saves the fitted version", async () => {
    let n = 3;
    const { p, events, save } = setup({ compile: async (kind) => (kind === "resume" ? n-- : 1) });
    await p.run();
    const steps = events.flatMap((e) => (e.type === "pages" && e.kind === "resume" ? [[e.value, e.action]] : []));
    expect(steps).toEqual([[3, "Laid out at the template defaults"], [2, "Tightening line spacing"], [2, "Fits on 2 pages"]]);
    expect(save.mock.calls[0][1][0]).toMatchObject({ theme: { lineHeight: 1.3 } });
  });

  it("warns when the resume can't fit", async () => {
    const { p, events } = setup({ compile: async (kind) => (kind === "resume" ? 3 : 1) });
    await p.run();
    expect(events.find((e) => e.type === "stage" && e.id === "fit" && e.status !== "active")).toMatchObject({ status: "warning", note: "Still 3 pages. Trim content in Studio." });
    expect(events.at(-1)).toMatchObject({ type: "done" });
  });
});

describe("coverageFinding (TASK-26, SPEC §10.1)", () => {
  it("flags coverage below 60% with the first three missing keywords, and nothing from 60%", () => {
    expect(coverageFinding(50, ["Go", "Kafka", "Rust", "Java"], "s-1")).toEqual({ type: "coverage", doc: "resume", sectionId: "s-1", title: "Keyword coverage is 50%", detail: "Go, Kafka and Rust from the job brief don't appear in the resume." });
    expect(coverageFinding(59, ["Go"], "s-1")?.detail).toBe("Go from the job brief doesn't appear in the resume.");
    expect(coverageFinding(60, ["Go"], "s-1")).toBeNull();
  });
});
