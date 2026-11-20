import { describe, expect, it } from "vitest";
import { runChecks, type CheckDoc } from "@/lib/checks/run";
import type { Section } from "@/lib/schemas/document";
import { kbSchema, type KnowledgeBase } from "@/lib/schemas/kb";
import seed from "../fixtures/kb.json";

// SPEC §10 rules engine, §18.1: pure functions, no LLM.
const kb: KnowledgeBase = kbSchema.parse(seed);

const summary = (text: string, extra: Partial<Section> = {}): Section => ({ id: "s-sum", kind: "summary", title: "Summary", hidden: false, text, ...extra }) as Section;
const role = (bullets: { text: string; source: string }[], extra: Partial<Section> = {}): Section =>
  ({
    id: "s-exp",
    kind: "experience",
    title: "Experience",
    hidden: false,
    items: [{ id: "i-bw", ref: "role-brightwater", heading: "Senior Software Engineer", sub: "Brightwater Logistics", bullets: bullets.map((b, i) => ({ id: `b${i}`, ...b })) }],
    ...extra,
  }) as Section;
const resume = (...sections: Section[]): CheckDoc => ({ kind: "resume", sections });
const check = (doc: CheckDoc, keywords: string[] = [], notes?: string) => runChecks(doc, { keywords }, kb, notes);

describe("keyword coverage (AC1)", () => {
  it("matches exact, hyphen/space and plural forms", () => {
    const r = check(resume(summary("Built event driven services and a design system in React.")), ["React", "Event-driven", "Design systems", "Kubernetes"]);
    expect(r.matched).toEqual(["React", "Event-driven", "Design systems"]);
    expect(r.missing.map((m) => m.keyword)).toEqual(["Kubernetes"]);
  });

  it("ignores hidden sections", () => {
    const r = check(resume(summary("Plain text."), role([{ text: "Wrote GraphQL APIs", source: "hl-bw-2" }], { hidden: true })), ["GraphQL"]);
    expect(r.missing).toEqual([{ keyword: "GraphQL", inKb: true }]);
  });

  it("sets inKb from the knowledge base and the application's notes", () => {
    const r = check(resume(summary("Plain text.")), ["Terraform", "Kubernetes", "Kafka"], "I also ran Kafka at a meetup.");
    expect(r.missing).toEqual([
      { keyword: "Terraform", inKb: true },
      { keyword: "Kubernetes", inKb: false },
      { keyword: "Kafka", inKb: true },
    ]);
  });
});

describe("banned phrases (AC2)", () => {
  const banned = (doc: CheckDoc) => check(doc).findings.filter((f) => f.type === "banned");

  it("flags a phrase once per section, with the SPEC copy", () => {
    const r = banned(resume(summary("A results driven engineer. Results-driven, always."), role([{ text: "Results-driven rebuild of the dashboard", source: "hl-bw-1" }])));
    expect(r).toEqual([
      { type: "banned", sectionId: "s-sum", title: '"results-driven" is on the banned-phrase list', detail: "Found in Summary. Phrases like this read as generic or AI-written." },
      { type: "banned", sectionId: "s-exp", title: '"results-driven" is on the banned-phrase list', detail: "Found in Experience. Phrases like this read as generic or AI-written." },
    ]);
  });

  it("skips headings, employers and item names the user can't reword; the same word in a bullet counts (TASK-48)", () => {
    const named = role([{ text: "Rebuilt the dispatch board", source: "hl-bw-1" }]);
    if ("items" in named) Object.assign(named.items[0], { heading: "Passionate Paws app", sub: "Dynamic Logistics", meta: "Synergy Park" });
    expect(banned(resume(named))).toEqual([]);
    if ("items" in named) named.items[0].bullets![0].text = "Built a dynamic dispatch board";
    expect(banned(resume(named)).map((f) => f.title)).toEqual(['"dynamic" is on the banned-phrase list']);
  });

  it("matches whole words only: dynamically and leveraged pass", () => {
    expect(banned(resume(summary("Dynamically scaled services and leveraged caching.")))).toEqual([]);
    expect(banned(resume(summary("A dynamic, passionate team player.")))).toHaveLength(3);
  });

  it("ignores hidden sections", () => {
    expect(banned(resume(summary("A passionate engineer.", { hidden: true })))).toEqual([]);
  });
});

describe("claim grounding (AC3)", () => {
  const grounding = (doc: CheckDoc, notes?: string) => check(doc, [], notes).findings.filter((f) => f.type === "grounding");
  const bullet = (text: string, source: string) => grounding(resume(role([{ text, source }])));

  it("flags a number its source doesn't have", () => {
    expect(bullet("Reduced AWS spend by 40% by right-sizing ECS services", "hl-bw-3")).toEqual([
      {
        type: "grounding",
        sectionId: "s-exp",
        bulletId: "b0",
        title: '"40%" doesn\'t match your knowledge base',
        detail: 'Under Brightwater Logistics. Your knowledge base says: "Reduced AWS spend by 25% by right-sizing ECS services and adding autoscaling"',
      },
    ]);
  });

  it("compares whole number tokens, not substrings", () => {
    expect(bullet("Reduced AWS spend by 5%", "hl-bw-3").map((f) => f.title)).toEqual(['"5%" doesn\'t match your knowledge base']);
  });

  it("passes numbers the source has, ignores years and a full stop", () => {
    expect(bullet("Cut dashboard load from 4.2s to 1.1s in React", "hl-bw-1")).toEqual([]);
    expect(bullet("Since 2022, reduced AWS spend by 25%.", "hl-bw-3")).toEqual([]);
    expect(bullet("Go CLI with 400.", "hl-ll-1")).toEqual([]);
  });

  it("flags a tech term the role doesn't record, but not one elsewhere in the same role", () => {
    expect(bullet("Streamed quotes through Kafka on AWS Lambda", "hl-bw-2").map((f) => [f.title, f.detail])).toEqual([
      ["Mentions Kafka, which this role doesn't record", "Under Brightwater Logistics. Add it to the role in your knowledge base if it's true."],
    ]);
    expect(bullet("Rebuilt the dashboard in React with Storybook", "hl-bw-1")).toEqual([]);
  });

  it("flags a bullet whose source is missing", () => {
    expect(bullet("Did something", "hl-nope").map((f) => f.title)).toEqual(["Bullet has no source in your knowledge base"]);
  });

  it("flags a skill the KB doesn't have, without splitting a parenthesised one", () => {
    const skills = { id: "s-sk", kind: "skills", title: "Skills", hidden: false, items: [{ id: "i1", ref: "sk-be", heading: "Tools", line: "TypeScript, Kafka, AWS (Lambda, ECS, SQS)" }] } as Section;
    expect(grounding(resume(skills))).toEqual([
      { type: "grounding", sectionId: "s-sk", title: 'Skill "Kafka" isn\'t in your knowledge base', detail: "Every claim needs a stored fact. Add the skill to your knowledge base or remove it here." },
    ]);
  });

  it("checks summary numbers against the KB and notes, ignoring years and spelled-out numbers", () => {
    const text = "Engineer since 2019 with eight years, 140 schools, 3,100 users and 75 releases.";
    expect(grounding(resume(summary(text))).map((f) => [f.title, f.detail])).toEqual([['"75" doesn\'t appear in your knowledge base', "In Summary."]]);
    expect(grounding(resume(summary(text)), "Shipped 75 releases last year")).toEqual([]);
  });
});

describe("parse safety (AC4)", () => {
  const headings = (doc: CheckDoc) => check(doc).parse.find((p) => p.label === "Standard section headings");

  it("fails a non-standard resume heading with its hint, and the other checks pass", () => {
    const { parse } = check(resume(summary("Plain."), summary("Plain.", { id: "s-x", title: "My Journey" })));
    expect(parse).toEqual([
      { label: "Single-column layout", ok: true },
      { label: "Selectable text in reading order", ok: true },
      { label: "Standard section headings", ok: false, hint: "Rename unusual headings so job sites can find them" },
      { label: "No tables, columns or images", ok: true },
      { label: "Contact details in the page body", ok: true },
    ]);
  });

  it("passes standard headings in any case, a hidden odd one and any cover letter", () => {
    expect(headings(resume(summary("x", { title: "Work Experience" }), summary("x", { title: "My Journey", hidden: true })))?.ok).toBe(true);
    expect(headings({ kind: "coverLetter", sections: [{ id: "p1", kind: "paragraph", title: "Opening", hidden: false, text: "Hello." }] })?.ok).toBe(true);
  });
});

describe("quoted requirements (TASK-24 review of §10.3)", () => {
  it("a cover letter paragraph may quote the ad's numbers; a summary may not", () => {
    const para = { id: "p-fit", kind: "paragraph", title: "Fit", hidden: false, text: 'Your ad asks for "5+ years building web apps".' } as Section;
    const brief = { keywords: [], requirements: ["5+ years building production web applications"] };
    expect(runChecks({ kind: "coverLetter", sections: [para] }, brief, kb).findings).toEqual([]);
    expect(runChecks(resume(summary("I have 5+ years.")), brief, kb).findings.map((f) => f.title)).toEqual(['"5" doesn\'t appear in your knowledge base']);
  });
});
