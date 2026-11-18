import { sectionText } from "@/lib/doc/plain-text";
import { kbText, kwMatch, matchedKeywords } from "@/lib/match/keywords";
import type { JobBrief } from "@/lib/schemas/brief";
import type { ResumeDocument } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { BANNED_PHRASES } from "@/lib/rules/banned-phrases";

// Rules engine (SPEC §10; ported from mock docs.js runChecks). Pure functions, no LLM; the Checks panel runs it.

export type CheckDoc = Pick<ResumeDocument, "kind" | "sections">;
export type Finding = { type: "grounding" | "banned" | "coverage"; sectionId: string; bulletId?: string; title: string; detail: string };
export type Checks = {
  matched: string[];
  missing: { keyword: string; inKb: boolean }[];
  findings: Finding[];
  parse: { label: string; ok: boolean; hint?: string }[];
};

// Whole words only (policy, SPEC §10.2): "dynamically" and "leveraged" don't match. Hyphens equal spaces.
const BANNED = BANNED_PHRASES.map((ph) => [ph, new RegExp(`(?<![a-z0-9])${ph.replace(/[- ]/g, "[- ]")}(?![a-z0-9])`, "i")] as const);

export function runChecks(doc: CheckDoc, brief: Pick<JobBrief, "keywords">, kb: KnowledgeBase, notes = ""): Checks {
  const visible = doc.sections.filter((s) => !s.hidden);
  const matched = matchedKeywords(visible.map(sectionText).join(" "), brief.keywords);
  const facts = `${kbText(kb)} ${notes}`; // notes count as facts the user supplied
  const missing = brief.keywords.filter((k) => !matched.includes(k)).map((keyword) => ({ keyword, inKb: kwMatch(facts, keyword) }));
  const findings: Finding[] = [];

  for (const s of visible) {
    const text = sectionText(s);
    for (const [ph, re] of BANNED)
      if (re.test(text)) findings.push({ type: "banned", sectionId: s.id, title: `"${ph}" is on the banned-phrase list`, detail: `Found in ${s.title}. Phrases like this read as generic or AI-written.` });
  }

  return { matched, missing, findings, parse: [] };
}
