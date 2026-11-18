import { describe, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { buildSkeleton } from "../../lib/generate/skeleton";
import { kbSchema, type KnowledgeBase } from "../../lib/schemas/kb";
import { documentSchema, type Section } from "../../lib/schemas/document";
import { THEME_DEFAULTS } from "../../lib/schemas/theme";
import type { JobBrief } from "../../lib/schemas/brief";

// SPEC §8.3 call 3, §6.3 rules, §18.1 Skeleton builder (TASK-13 AC1).
const seed = (): KnowledgeBase => kbSchema.parse(structuredClone(fixture));
const brief: JobBrief = {
  title: "Senior Full Stack Engineer",
  company: "Mintleaf",
  location: "Melbourne VIC",
  seniority: "Senior",
  requirements: ["React, TypeScript and Node.js"],
  niceToHave: [],
  keywords: ["React", "AWS"],
  workRights: "Not stated",
};
const titles = (d: { sections: { title: string }[] }) => d.sections.map((s) => s.title);
const refs = (d: { sections: Section[] }) => d.sections.flatMap((s) => ("items" in s ? s.items.map((i) => i.ref) : []));

describe("skeleton builder", () => {
  it("uses only the selected entries, plus every skill group", () => {
    const { resume } = buildSkeleton(seed(), brief, ["role-mosaic", "ed-unsw", "ref-sam"], THEME_DEFAULTS);
    expect(refs(resume)).toEqual(["role-mosaic", "sk-lang", "sk-fe", "sk-be", "sk-cloud", "ed-unsw", "ref-sam"]);
  });

  it("keeps the section order, omits empty sections, keeps Summary, and puts Referees last", () => {
    const kb = seed();
    kb.volunteering = [{ id: "vol-1", title: "Mentor", company: "Code Club", start: "2021", end: "Present", highlights: [{ id: "hl-v-1", text: "Ran weekly sessions", skills: [] }] }];
    kb.additional = [
      { id: "add-1", title: "Languages", notes: "English, Nepali" },
      { id: "add-orig", title: "Original resume", notes: "…", referenceOnly: true },
    ];
    const all = ["role-brightwater", "pf-tidewatch", "ed-unsw", "cr-aws", "vol-1", "add-1", "add-orig", "ref-dana"];
    expect(titles(buildSkeleton(kb, brief, all, THEME_DEFAULTS).resume)).toEqual([
      "Summary", "Experience", "Skills", "Portfolio", "Education", "Certifications and awards", "Volunteer work", "Languages", "Referees",
    ]);
    expect(titles(buildSkeleton(kb, brief, ["role-brightwater"], THEME_DEFAULTS).resume)).toEqual(["Summary", "Experience", "Skills"]);
  });

  it("starts empty: summary text, bullets on entries with highlights", () => {
    const { resume } = buildSkeleton(seed(), brief, ["role-civic", "pf-ledgerline"], THEME_DEFAULTS);
    const [summary, exp, , pf] = resume.sections;
    expect(summary).toMatchObject({ kind: "summary", text: "", hidden: false });
    expect(exp.kind === "experience" && exp.items[0].bullets).toEqual([]);
    expect(pf.kind === "portfolio" && pf.items[0].bullets).toEqual([]);
  });

  it("formats experience meta as 'Location | Start to End'", () => {
    const kb = seed();
    const { resume } = buildSkeleton(kb, brief, ["role-brightwater"], THEME_DEFAULTS);
    const r = kb.roles[0];
    const exp = resume.sections[1];
    expect(exp.kind === "experience" && exp.items[0]).toMatchObject({ heading: r.title, sub: r.company, meta: `${r.location} | ${r.start} to ${r.end}` });
    delete kb.roles[0].location;
    const again = buildSkeleton(kb, brief, ["role-brightwater"], THEME_DEFAULTS).resume.sections[1];
    expect(again.kind === "experience" && again.items[0].meta).toBe(`${r.start} to ${r.end}`);
  });

  it("keeps 'AWS (Lambda, ECS, SQS)' intact in the skills line", () => {
    const skills = buildSkeleton(seed(), brief, [], THEME_DEFAULTS).resume.sections.find((s) => s.kind === "skills");
    expect(skills?.kind === "skills" && skills.items.find((i) => i.ref === "sk-cloud")?.line).toBe("AWS (Lambda, ECS, SQS), Docker, Terraform, GitHub Actions");
  });

  it("builds a cover letter of 4 empty paragraphs with a recipient", () => {
    const { coverLetter } = buildSkeleton(seed(), brief, [], THEME_DEFAULTS);
    expect(titles(coverLetter)).toEqual(["Opening", "Evidence", "Fit", "Close"]);
    expect(coverLetter.sections.every((s) => s.kind === "paragraph" && s.text === "")).toBe(true);
    expect(coverLetter.recipient).toEqual({ name: "Hiring team", company: "Mintleaf", location: "Melbourne VIC" });
  });

  it("produces valid documents with unique IDs and the given theme", () => {
    const { resume, coverLetter } = buildSkeleton(seed(), brief, ["role-brightwater", "role-mosaic", "pf-tidewatch", "ref-dana"], THEME_DEFAULTS);
    for (const d of [resume, coverLetter]) {
      expect(documentSchema.parse(d).theme).toEqual(THEME_DEFAULTS);
      const ids = d.sections.flatMap((s) => [s.id, ...("items" in s ? s.items.map((i) => i.id) : [])]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
