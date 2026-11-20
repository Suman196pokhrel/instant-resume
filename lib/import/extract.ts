import { z } from "zod";
import { tidyHeading } from "../utils";
import type { LlmAdapter } from "@/lib/llm/adapter";
import type { ParsedDraft } from "./parse";

// Provider extraction (SPEC §14.1a): one call sorts the resume into the review draft. Each highlight also comes back
// with its metric and skills, existing KB fields that matching, generation and the number checks reuse later, so
// the user reviews them once and no later call re-derives them. Nothing is saved before Review.

// Forgiving per field: a missing, null or odd value becomes "" or [] instead of failing the whole answer, so one
// slip doesn't lose the import. The answer is still validated; the user reviews every field before saving.
const s = z.string().catch("");
const list = <T extends z.ZodType>(item: T) => z.array(item).catch([]);
const highlight = z.object({ text: s, metric: s, skills: list(z.string()) });
const role = z.object({ title: s, company: s, location: s, start: s, end: s, highlights: list(highlight) });
const contact = z.object({ name: s, email: s, phone: s, location: s, linkedin: s, github: s });

export const extractionSchema = z.object({
  contact: contact.catch(contact.parse({})),
  roles: list(role),
  volunteering: list(role),
  portfolio: list(z.object({ name: s, summary: s, link: s, highlights: list(highlight) })),
  education: list(z.object({ degree: s, institution: s, year: s, notes: s })),
  skills: list(z.object({ group: s, items: list(z.string()) })),
  credentials: list(z.object({ kind: z.enum(["Certification", "Award", "Publication", "Patent"]).catch("Certification"), title: s, issuer: s, year: s })),
  referees: list(z.object({ name: s, title: s, company: s, contact: s })),
  additional: list(z.object({ title: s, notes: s })),
});
export type Extraction = z.infer<typeof extractionSchema>;

const SYSTEM = `You sort a resume into the requested JSON structure.
- Copy facts only from the resume. Never invent or infer anything: no dates, employers, numbers, skills or contact details that aren't written there. Use "" for anything not stated.
- Never fill in work rights. Work rights, visa or citizenship text goes in "additional" with its heading.
- Every section that doesn't fit a field goes in "additional" (its heading as title, its text as notes). Never drop content.
- Text copied from a PDF wraps long bullets onto several lines: join a wrapped line back onto its bullet, so each bullet is one highlight. A line such as "Title | Company | Location  Dates" starts a new role; it is never a highlight.
- Each bullet is one highlight. "text" is the bullet as written, without the bullet symbol. "metric" is the measurable result copied exactly from that bullet (such as "25%" or "4.2s to 1.1s"), or "". "skills" are the tools, technologies or skills named in that bullet.
- Skills: when the resume lists skills in one block, sort them into 2 to 5 groups with short names (such as "Customer service", "Technical", "Tools and systems", "Languages"). Keep each skill as written; never add one.
- Volunteer roles go in "volunteering", projects in "portfolio", and certifications, awards, publications and patents in "credentials" with that kind.
- Keep the resume's own spelling and wording.`;

type Entry = Record<string, unknown>;
const present = (e: Entry): Entry => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== ""));
const hasContent = (e: Entry) => Object.values(e).some((v) => (Array.isArray(v) ? v.length > 0 : v !== ""));

const BULLET = /^[\s●•▪◦‣∙·*–-]+/;
const squash = (t: string) => t.toLowerCase().replace(/\s+/g, " ");

function highlights(list: Extraction["roles"][number]["highlights"]) {
  return list
    .map((h) => ({ ...h, text: h.text.replace(BULLET, "").trim() }))
    .filter((h) => h.text)
    .map((h) => ({ text: h.text, ...(h.metric && h.text.includes(h.metric) && { metric: h.metric }), skills: [...new Set(h.skills.filter(Boolean))] })); // a metric not in its own bullet is dropped
}

const entries = <T extends Entry>(list: T[], map: (e: T) => Entry = (e) => e) => list.filter(hasContent).map((e) => present(map(e)));

/** The review draft: the same shape the on-device parser returns, plus the original text as reference only. */
export function toDraft(x: Extraction, original: string): ParsedDraft {
  const text = squash(original);
  const stated = (v: string) => (v && text.includes(squash(v.trim())) ? v.trim() : ""); // a date the resume doesn't show was made up
  const withHighlights = <T extends { highlights: Extraction["roles"][number]["highlights"]; start?: string; end?: string }>(e: T) => ({
    ...e,
    ...("start" in e && { start: stated(e.start ?? ""), end: stated(e.end ?? "") }),
    highlights: highlights(e.highlights),
  });
  return {
    contact: present({ id: "kb-contact", ...x.contact }),
    roles: entries(x.roles, withHighlights),
    volunteering: entries(x.volunteering, withHighlights),
    portfolio: entries(x.portfolio, withHighlights),
    education: entries(x.education),
    skills: entries(x.skills, (g) => ({ group: tidyHeading(g.group) || "Skills", items: [...new Set(g.items.map((i) => i.trim()).filter(Boolean))] })),
    credentials: entries(x.credentials),
    referees: entries(x.referees),
    additional: [...entries(x.additional, (a) => ({ ...a, title: tidyHeading(a.title) })), { title: "Original resume text (reference)", notes: original, referenceOnly: true }],
  };
}

export async function extractResume(text: string, adapter: LlmAdapter, signal?: AbortSignal): Promise<ParsedDraft> {
  const { object } = await adapter.generateObject({ name: "extract", schema: extractionSchema, system: SYSTEM, prompt: `<resume>\n${text}\n</resume>`, maxOutputTokens: 16000, jsonInPrompt: true, signal });
  return toDraft(object, text);
}

/** The on-device parser's draft as a provider answer: the mock provider's deterministic "extract" fixture. */
export function toExtraction(d: ParsedDraft): Extraction {
  const str = (e: Entry, k: string) => (typeof e[k] === "string" ? (e[k] as string) : "");
  const hl = (e: Entry) => ((e.highlights as Entry[] | undefined) ?? []).map((h) => ({ text: str(h, "text"), metric: str(h, "metric"), skills: (h.skills as string[]) ?? [] }));
  const role = (e: Entry) => ({ title: str(e, "title"), company: str(e, "company"), location: str(e, "location"), start: str(e, "start"), end: str(e, "end"), highlights: hl(e) });
  return {
    contact: { name: str(d.contact, "name"), email: str(d.contact, "email"), phone: str(d.contact, "phone"), location: str(d.contact, "location"), linkedin: "", github: "" },
    roles: d.roles.map(role),
    volunteering: d.volunteering.map(role),
    portfolio: d.portfolio.map((e) => ({ name: str(e, "name"), summary: str(e, "summary"), link: str(e, "link"), highlights: hl(e) })),
    education: d.education.map((e) => ({ degree: str(e, "degree"), institution: str(e, "institution"), year: str(e, "year"), notes: str(e, "notes") })),
    skills: d.skills.map((e) => ({ group: str(e, "group"), items: (e.items as string[]) ?? [] })),
    credentials: d.credentials.map((e) => ({ kind: (str(e, "kind") || "Certification") as Extraction["credentials"][number]["kind"], title: str(e, "title"), issuer: str(e, "issuer"), year: str(e, "year") })),
    referees: d.referees.map((e) => ({ name: str(e, "name"), title: str(e, "title"), company: str(e, "company"), contact: str(e, "contact") })),
    additional: d.additional.filter((e) => !e.referenceOnly).map((e) => ({ title: str(e, "title"), notes: str(e, "notes") })),
  };
}
