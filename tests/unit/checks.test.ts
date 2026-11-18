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
