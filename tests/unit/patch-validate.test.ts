import { describe, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { buildSkeleton } from "../../lib/generate/skeleton";
import { GENERATION, rewriteRules, validatePatch, type Op } from "../../lib/patch/validate";
import { kbSchema } from "../../lib/schemas/kb";
import { THEME_DEFAULTS } from "../../lib/schemas/theme";
import type { JobBrief } from "../../lib/schemas/brief";

// SPEC §8.3 Patch validator, §18.1 (TASK-13 AC2, AC3).
const kb = kbSchema.parse(structuredClone(fixture));
const brief = { title: "Engineer", company: "Mintleaf", location: "Melbourne VIC", seniority: "Senior", requirements: [], niceToHave: [], keywords: [], workRights: "Not stated" } as JobBrief;
// Summary 0, Experience 1 (brightwater 0, mosaic 1), Skills 2 (sk-lang, sk-fe, sk-be, sk-cloud), Portfolio 3, Referees 4
const { resume, coverLetter } = buildSkeleton(kb, brief, ["role-brightwater", "role-mosaic", "pf-tidewatch", "ref-dana"], THEME_DEFAULTS);
const gen = (doc: typeof resume, ops: Op[]) => validatePatch(doc, ops, { rules: GENERATION, kb });
const bullet = (k: number, source: string, text = "Did a thing"): Op => ({ op: "add", path: `/sections/1/items/${k}/bullets/-`, value: { text, source } });

const GOOD: Op[] = [
  { op: "replace", path: "/sections/0/text", value: "Senior engineer with eight years in web apps." },
  bullet(0, "hl-bw-1"),
  bullet(0, "hl-bw-2"),
  bullet(1, "hl-mo-1"),
  { op: "add", path: "/sections/3/items/0/bullets/-", value: { text: "Built Tidewatch", source: "hl-tw-1" } },
  { op: "replace", path: "/sections/2/items/3/line", value: "Terraform, AWS (Lambda, ECS, SQS), GitHub Actions, Docker" },
];

function rejects(doc: typeof resume, ops: Op[], rules = GENERATION) {
  const before = structuredClone(doc);
  const result = validatePatch(doc, ops, { rules, kb });
  expect(result.ok).toBe(false);
  expect(doc).toEqual(before); // nothing mutated on rejection
}

describe("patch validator: generation", () => {
  it("accepts the allowed ops and returns the patched copy with app-assigned bullet IDs", () => {
    const before = structuredClone(resume);
    const result = gen(resume, GOOD);
    if (!result.ok) throw new Error(result.reason);
    expect(result.count).toBe(6);
    expect(resume).toEqual(before);
    const s = result.doc.sections;
    expect(s[0].kind === "summary" && s[0].text).toMatch(/^Senior engineer/);
    const bullets = s[1].kind === "experience" ? s[1].items.flatMap((i) => i.bullets ?? []) : [];
    expect(bullets.map((b) => b.source)).toEqual(["hl-bw-1", "hl-bw-2", "hl-mo-1"]);
    const ids = bullets.map((b) => b.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.every((id) => /^b-/.test(id))).toBe(true);
  });

  it("ignores a bullet ID sent by the model", () => {
    const dup = { op: "add", path: "/sections/1/items/0/bullets/-", value: { id: "b-1", text: "x", source: "hl-bw-1" } } as Op;
    const result = gen(resume, [dup, dup]);
    expect(result.ok && result.doc.sections[1].kind === "experience" && new Set(result.doc.sections[1].items[0].bullets!.map((b) => b.id)).size).toBe(2);
  });

  it("fills the cover letter paragraphs", () => {
    const ops: Op[] = [0, 1, 2, 3].map((i) => ({ op: "replace", path: `/sections/${i}/text`, value: `Paragraph ${i}` }));
    expect(validatePatch(coverLetter, ops, { rules: GENERATION, kb }).ok).toBe(true);
  });

  it.each([
    ["an unknown source", [bullet(0, "hl-nope")]],
    ["a source from another entry", [bullet(0, "hl-mo-1")]],
    ["a source from an unselected entry", [bullet(1, "hl-cd-1")]],
    ["a bullet without text", [bullet(0, "hl-bw-1", "  ")]],
  ])("rejects %s (AC2)", (_name, ops) => rejects(resume, ops));

  it.each<[string, Op[]]>([
    ["text on an items section", [{ op: "replace", path: "/sections/1/text", value: "x" }]],
    ["bullets on a skills item", [{ op: "add", path: "/sections/2/items/0/bullets/-", value: { text: "x", source: "hl-bw-1" } }]],
    ["bullets on a referee", [{ op: "add", path: "/sections/4/items/0/bullets/-", value: { text: "x", source: "hl-bw-1" } }]],
    ["a skills line with a new skill", [{ op: "replace", path: "/sections/2/items/3/line", value: "AWS (Lambda, ECS, SQS), Docker, Terraform, GitHub Actions, Kubernetes" }]],
    ["a skills line that splits a parenthesised skill", [{ op: "replace", path: "/sections/2/items/3/line", value: "AWS (Lambda, ECS), SQS, Docker, Terraform, GitHub Actions" }]],
    ["a skills line that drops a skill", [{ op: "replace", path: "/sections/2/items/3/line", value: "Docker, Terraform, GitHub Actions" }]],
    ["an index out of range", [{ op: "replace", path: "/sections/9/text", value: "x" }]],
    ["a bullet text edit (rewrite only)", [{ op: "replace", path: "/sections/1/items/0/bullets/0/text", value: "x" }]],
    ["a remove", [{ op: "remove", path: "/sections/1/items/0" }]],
    ["an id change", [{ op: "replace", path: "/sections/0/id", value: "s-x" }]],
    ["a kind change", [{ op: "replace", path: "/sections/0/kind", value: "paragraph" }]],
    ["a hidden change", [{ op: "replace", path: "/sections/0/hidden", value: true }] as unknown as Op[]],
    ["a theme change", [{ op: "replace", path: "/theme/accent", value: "#000000" }]],
    ["a section move", [{ op: "move", from: "/sections/0", path: "/sections/1" }]],
    ["a recipient change", [{ op: "replace", path: "/recipient/name", value: "Ms Lee" }]],
    ["a non-string text", [{ op: "replace", path: "/sections/0/text", value: 42 }] as unknown as Op[]],
  ])("rejects %s (AC3)", (_name, ops) => rejects(resume, ops));

  it("rejects the whole patch when one op is bad", () => rejects(resume, [...GOOD, bullet(0, "hl-nope")]));
});

describe("patch validator: rewrite of one section", () => {
  const filled = (() => {
    const r = gen(resume, GOOD);
    if (!r.ok) throw new Error(r.reason);
    return r.doc;
  })();
  const rw = (ops: Op[]) => validatePatch(filled, ops, { rules: rewriteRules(1), kb });

  it("accepts text edits, reorders, adds and removes within the section", () => {
    const result = rw([
      { op: "replace", path: "/sections/1/items/0/bullets/1/text", value: "Shorter" },
      { op: "move", from: "/sections/1/items/0/bullets/1", path: "/sections/1/items/0/bullets/0" },
      { op: "add", path: "/sections/1/items/0/bullets/-", value: { text: "New", source: "hl-bw-3" } },
      { op: "remove", path: "/sections/1/items/1/bullets/0" },
    ]);
    if (!result.ok) throw new Error(result.reason);
    const items = result.doc.sections[1].kind === "experience" ? result.doc.sections[1].items : [];
    expect(items[0].bullets!.map((b) => [b.source, b.text])).toEqual([["hl-bw-2", "Shorter"], ["hl-bw-1", "Did a thing"], ["hl-bw-3", "New"]]);
    expect(items[1].bullets).toEqual([]);
  });

  it("an older bullet whose highlight was deleted doesn't block a rewrite elsewhere", () => {
    const orphaned = structuredClone(filled);
    const pf = orphaned.sections[3];
    if (pf.kind === "portfolio") pf.items[0].bullets![0].source = "hl-deleted";
    expect(validatePatch(orphaned, [{ op: "replace", path: "/sections/1/items/0/bullets/0/text", value: "Shorter" }], { rules: rewriteRules(1), kb }).ok).toBe(true);
  });

  it.each<[string, Op[]]>([
    ["a path in another section", [{ op: "replace", path: "/sections/0/text", value: "x" }]],
    ["a move across items", [{ op: "move", from: "/sections/1/items/0/bullets/0", path: "/sections/1/items/1/bullets/0" }]],
    ["a cross-entry add", [{ op: "add", path: "/sections/1/items/1/bullets/-", value: { text: "x", source: "hl-bw-3" } }]],
    ["removing an item", [{ op: "remove", path: "/sections/1/items/1" }]],
    ["a heading change", [{ op: "replace", path: "/sections/1/items/0/heading", value: "CTO" }]],
  ])("rejects %s (AC3)", (_name, ops) => rejects(filled, ops, rewriteRules(1)));
});
