import { describe, expect, it } from "vitest";
import { sectionDiff, wordDiff } from "@/lib/doc/diff";
import type { Section } from "@/lib/schemas/document";

// SPEC §14.5 Proposal card: a word diff of the proposed section, bullet rows tagged (TASK-16 AC2).

describe("wordDiff", () => {
  it("keeps shared words and merges each run of deleted or inserted words", () => {
    expect(wordDiff("Built the tracking dashboard", "Rebuilt the shipment tracking dashboard")).toEqual([
      { t: "del", text: "Built" },
      { t: "ins", text: "Rebuilt" },
      { t: "same", text: " the " },
      { t: "ins", text: "shipment " },
      { t: "same", text: "tracking dashboard" },
    ]);
  });

  it("no change is one run", () => expect(wordDiff("a b", "a b")).toEqual([{ t: "same", text: "a b" }]));
  it("from empty is one insert", () => expect(wordDiff("", "New text")).toEqual([{ t: "ins", text: "New text" }]));
});

describe("sectionDiff", () => {
  const b = (id: string, text: string) => ({ id, text, source: `hl-${id}` });
  const before: Section = {
    id: "s-1",
    kind: "experience",
    title: "Experience",
    hidden: false,
    items: [{ id: "i-1", ref: "role-a", heading: "Engineer", sub: "Acme", bullets: [b("1", "One"), b("2", "Two"), b("3", "Three")] }],
  };

  it("a text section is one row of words", () => {
    const p = (text: string): Section => ({ id: "p", kind: "paragraph", title: "Opening", hidden: false, text });
    expect(sectionDiff(p("Hi there."), p("Hello there."))).toEqual({ text: [{ t: "del", text: "Hi" }, { t: "ins", text: "Hello" }, { t: "same", text: " there." }] });
  });

  it("tags a new bullet from the knowledge base, a bullet moved up and a removed bullet", () => {
    const after: Section = { ...before, items: [{ ...before.items[0], bullets: [b("new", "Mentored graduates"), b("3", "Three"), b("1", "One")] }] };
    const { items } = sectionDiff(before, after);
    expect(items).toHaveLength(1);
    expect(items![0].head).toBe("Acme");
    expect(items![0].bullets.map((r) => [r.parts.map((x) => x.t).join(), r.tag])).toEqual([
      ["ins", "from knowledge base"],
      ["same", "moved up"],
      ["same", undefined],
      ["del", "removed"],
    ]);
  });

  it("diffs a skills line", () => {
    const skills: Section = { id: "s", kind: "skills", title: "Skills", hidden: false, items: [{ id: "i", ref: "sk", heading: "Cloud", line: "AWS, Docker" }] };
    const after: Section = { ...skills, items: [{ ...skills.items[0], line: "Docker, AWS" }] };
    expect(sectionDiff(skills, after).items![0].line?.some((x) => x.t === "ins")).toBe(true);
  });
});
