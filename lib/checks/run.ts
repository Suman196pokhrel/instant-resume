import { sectionText } from "@/lib/doc/plain-text";
import { kbText, kwMatch, matchedKeywords } from "@/lib/match/keywords";
import type { JobBrief } from "@/lib/schemas/brief";
import type { ResumeDocument } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";

// Rules engine (SPEC §10; ported from mock docs.js runChecks). Pure functions, no LLM; the Checks panel runs it.

export type CheckDoc = Pick<ResumeDocument, "kind" | "sections">;
export type Finding = { type: "grounding" | "banned" | "coverage"; sectionId: string; bulletId?: string; title: string; detail: string };
export type Checks = {
  matched: string[];
  missing: { keyword: string; inKb: boolean }[];
  findings: Finding[];
  parse: { label: string; ok: boolean; hint?: string }[];
};

export function runChecks(doc: CheckDoc, brief: Pick<JobBrief, "keywords">, kb: KnowledgeBase, notes = ""): Checks {
  const visible = doc.sections.filter((s) => !s.hidden);
  const matched = matchedKeywords(visible.map(sectionText).join(" "), brief.keywords);
  const facts = `${kbText(kb)} ${notes}`; // notes count as facts the user supplied
  const missing = brief.keywords.filter((k) => !matched.includes(k)).map((keyword) => ({ keyword, inKb: kwMatch(facts, keyword) }));
  return { matched, missing, findings: [], parse: [] };
}
