import { z } from "zod";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { kwMatch, matchedKeywords } from "@/lib/match/keywords";
import { BANNED_PHRASES } from "@/lib/rules/banned-phrases";
import type { JobBrief } from "@/lib/schemas/brief";
import type { Highlight, KnowledgeBase } from "@/lib/schemas/kb";

// Add what's missing (SPEC §8.3 call 5): the user says where they used the job's missing keywords; one call turns it
// into highlights on their jobs, volunteer roles and projects. Nothing is saved until the user ticks and adds them.

export const missingSchema = z.object({
  highlights: z.array(z.object({ entryId: z.string(), text: z.string(), metric: z.string(), keywords: z.array(z.string()) })),
  note: z.string(), // "" = none: strict output has no optional fields
});

export const SYSTEM = `You turn what a job seeker says about their own experience into short resume highlights for their knowledge base.
- What they said is the only source. Rephrase it as plain, specific highlights in active voice. Never add tools, numbers, scale, results or claims they didn't say.
- Put each highlight on the entry they name or clearly mean (a job, volunteer role or project from the list), by its id. If they don't say where and only one entry fits, use it. If you can't tell, leave it out and say so in note.
- One highlight per thing they did; it may show several keywords. keywords: the listed keywords it shows, spelt exactly as listed.
- metric: a number or result they stated, else "".
- note: "" or one short sentence about anything you couldn't place.
- Never use these words or phrases: ${BANNED_PHRASES.join(", ")}.
- Return only the JSON.`;

export type Owner = "roles" | "volunteering" | "portfolio";
export type Suggestion = { entryId: string; type: Owner; label: string; text: string; metric?: string; keywords: string[] };
export type MissingInput = { kb: KnowledgeBase; brief: JobBrief; keywords: string[]; text: string; spelling: "en-AU" | "en-US" };

const OWNERS: [Owner, string][] = [
  ["roles", "job"],
  ["volunteering", "volunteer role"],
  ["portfolio", "project"],
];
const SPELLING = { "en-AU": "Australian English", "en-US": "American English" };

/** The entries a highlight can go on, with the name the user sees. */
export function owners(kb: KnowledgeBase) {
  return OWNERS.flatMap(([type, kind]) =>
    (kb[type] ?? []).map((e: { id: string; title?: string; company?: string; name?: string; start?: string; end?: string }) => ({ type, kind, id: e.id, label: e.name ?? `${e.title}, ${e.company}`, dates: [e.start, e.end].filter(Boolean).join(" to ") }))
  );
}

export async function suggestMissing(input: MissingInput, adapter: LlmAdapter, signal?: AbortSignal): Promise<{ suggestions: Suggestion[]; note: string }> {
  const entries = owners(input.kb);
  const prompt = [
    `<entries>\n${JSON.stringify(entries.map(({ id, kind, label, dates }) => ({ id, kind, name: label, ...(dates && { dates }) })))}\n</entries>`,
    `<keywords>\n${JSON.stringify(input.keywords)}\n</keywords>`,
    `<said>\n${input.text.trim()}\n</said>`,
    `Spelling: ${SPELLING[input.spelling]}.`,
  ].join("\n\n");
  const { object } = await adapter.generateObject({ name: "missing", schema: missingSchema, system: SYSTEM, prompt, maxOutputTokens: 2000, signal });
  const byId = new Map(entries.map((e) => [e.id, e]));
  const suggestions = object.highlights.flatMap((h) => {
    const entry = byId.get(h.entryId);
    const text = h.text.trim();
    if (!entry || !text) return []; // only the user's own entries, never an empty bullet
    const keywords = input.keywords.filter((k) => h.keywords.some((x) => x.trim().toLowerCase() === k.toLowerCase()));
    return [{ entryId: entry.id, type: entry.type, label: entry.label, text, metric: h.metric.trim() || undefined, keywords }];
  });
  return { suggestions, note: object.note.trim() };
}

/** The highlight to save: tagged with its keywords and any other brief keyword it names, answering the requirement that names one. */
export function toHighlight(s: Pick<Suggestion, "text" | "metric" | "keywords">, brief: JobBrief): Omit<Highlight, "id"> {
  const skills = [...new Set([...s.keywords, ...matchedKeywords(s.text, brief.keywords)])];
  const evidenceFor = brief.requirements.find((r) => skills.some((k) => kwMatch(r, k))) ?? skills[0];
  return { text: s.text, metric: s.metric, skills, evidenceFor };
}
