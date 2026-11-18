import type { KnowledgeBase } from "@/lib/schemas/kb";

// Keyword matching on the device (SPEC §14.4, §10.1; ported from mock docs.js). Studio suggestions and coverage use
// it instead of an LLM call; the rules engine reuses it.

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Whole words, ignoring case: "Event-driven" matches "event driven", "Design systems" matches "design system".
 * Only words over 4 letters lose a plural s, so "AWS" never becomes "aw" (and matches "Award"), and "Go" doesn't match "Google".
 */
export function kwMatch(text: string, kw: string): boolean {
  const k = norm(kw);
  if (!k) return false;
  const base = k.length > 4 && k.endsWith("s") ? k.slice(0, -1) : k;
  const pattern = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[- ]/g, "[- ]");
  return new RegExp(`(?<![a-z0-9])${pattern}s?(?![a-z0-9])`).test(norm(text));
}

export const matchedKeywords = (text: string, keywords: string[]) => keywords.filter((k) => kwMatch(text, k));

type Entry = Record<string, unknown>;

/** Every string in an entry, highlights and their skills included. */
export function entryText(e: Entry): string {
  return Object.entries(e)
    .filter(([k]) => k !== "id" && k !== "referenceOnly")
    .flatMap(([, v]) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : entryText(x as Entry))) : []))
    .join(" ");
}

const additional = (kb: KnowledgeBase) => (kb.additional ?? []).filter((a) => !a.referenceOnly); // the original text never backs a claim
const skillList = (kb: KnowledgeBase) => kb.skills.flatMap((g) => g.items).join(" ");

/** All the KB's text that can back a claim. */
export function kbText(kb: KnowledgeBase): string {
  return [...kb.roles, ...(kb.volunteering ?? []), ...kb.portfolio, ...kb.education, ...kb.credentials, ...additional(kb)].map(entryText).join(" ") + " " + skillList(kb);
}

/** The entries Studio pre-ticks (as the mock): everything that usually belongs, plus portfolio items and non-certification credentials that match. */
export function suggestSelection(kb: KnowledgeBase, keywords: string[]): string[] {
  const matches = (e: Entry) => matchedKeywords(entryText(e), keywords).length > 0;
  return [
    ...kb.roles.map((r) => r.id),
    ...(kb.volunteering ?? []).map((r) => r.id),
    ...kb.portfolio.filter(matches).map((p) => p.id),
    ...kb.education.map((e) => e.id),
    ...kb.credentials.filter((c) => c.kind === "Certification" || matches(c)).map((c) => c.id),
    ...kb.referees.map((r) => r.id),
    ...additional(kb).map((a) => a.id),
  ];
}

/** Job keywords backed by the ticked entries plus the skills list ("Covers m of n keywords"). */
export function coverage(kb: KnowledgeBase, keywords: string[], selected: string[]): { covered: number; total: number } {
  const ids = new Set(selected);
  const entries = [...kb.roles, ...(kb.volunteering ?? []), ...kb.portfolio, ...kb.education, ...kb.credentials, ...additional(kb)].filter((e) => ids.has(e.id));
  const text = entries.map(entryText).join(" ") + " " + skillList(kb);
  return { covered: matchedKeywords(text, keywords).length, total: keywords.length };
}
