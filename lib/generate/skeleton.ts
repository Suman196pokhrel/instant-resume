import type { JobBrief } from "@/lib/schemas/brief";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import type { Theme } from "@/lib/schemas/theme";
import { newId, tidyHeading } from "@/lib/utils";

// The skeleton documents (SPEC §8.3 call 3, §6.3): built on the device from the selected entries, with empty
// summary, paragraph text and bullets for the LLM to fill. id and projectId are "draft" until the project is saved.

type Item = { ref: string; heading: string; sub?: string; meta?: string; line?: string; bullets?: [] };
type Draft = Omit<ResumeDocument, "id" | "projectId"> & { id: "draft"; projectId: "draft" };

const join = (sep: string, ...parts: (string | undefined)[]) => parts.filter(Boolean).join(sep) || undefined;
const dates = (start?: string, end?: string) => join(" to ", start, end);
const items = (title: string, kind: Exclude<Section["kind"], "summary" | "paragraph">, list: Item[]): Section[] =>
  list.length ? [{ id: newId("s"), kind, title, hidden: false, items: list.map((i) => ({ id: newId("i"), ...i })) }] : [];
// A summary or profile kept under Additional is a fact for the generated Summary, not a second summary on the page.
const SUMMARY_LIKE = /\b(summary|profile|objective|about me|career overview)\b/i;
const text = (kind: "summary" | "paragraph", title: string): Section => ({ id: newId("s"), kind, title, hidden: false, text: "" });

export function buildSkeleton(kb: KnowledgeBase, brief: JobBrief, selected: string[], theme: Theme): { resume: Draft; coverLetter: Draft } {
  const ids = new Set(selected);
  const pick = <T extends { id: string }>(list: T[] = []) => list.filter((e) => ids.has(e.id));
  const sections = [
    text("summary", "Summary"),
    ...items("Experience", "experience", pick(kb.roles).map((r) => ({ ref: r.id, heading: r.title, sub: r.company, meta: join(" | ", r.location, dates(r.start, r.end)), bullets: [] }))),
    ...items("Skills", "skills", kb.skills.map((g) => ({ ref: g.id, heading: tidyHeading(g.group), line: g.items.join(", ") }))), // skill groups aren't selectable (Studio step 3)
    ...items("Portfolio", "portfolio", pick(kb.portfolio).map((p) => ({ ref: p.id, heading: p.name, sub: p.summary, meta: p.link, bullets: [] }))),
    ...items("Education", "education", pick(kb.education).map((e) => ({ ref: e.id, heading: e.degree, sub: e.institution, meta: e.year, line: e.notes }))),
    ...items("Certifications and awards", "credentials", pick(kb.credentials).map((c) => ({ ref: c.id, heading: c.title, sub: c.issuer, meta: c.year }))),
    ...items("Volunteer work", "experience", pick(kb.volunteering).map((r) => ({ ref: r.id, heading: r.title, sub: r.company, meta: join(" | ", r.location, dates(r.start, r.end)), bullets: [] }))),
    ...pick(kb.additional)
      .filter((a) => !a.referenceOnly && !SUMMARY_LIKE.test(a.title))
      .flatMap((a) => items(tidyHeading(a.title), "additional", [{ ref: a.id, heading: "", line: a.notes }])), // the section title is the heading
    ...items("Referees", "referees", pick(kb.referees).map((r) => ({ ref: r.id, heading: r.name, sub: join(", ", r.title, r.company), meta: r.contact }))),
  ];
  return {
    resume: { id: "draft", projectId: "draft", kind: "resume", theme, sections },
    coverLetter: {
      id: "draft",
      projectId: "draft",
      kind: "coverLetter",
      theme,
      sections: ["Opening", "Evidence", "Fit", "Close"].map((t) => text("paragraph", t)),
      recipient: { name: "Hiring team", company: brief.company, location: brief.location },
    },
  };
}
