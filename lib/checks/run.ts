import { sectionText } from "@/lib/doc/plain-text";
import { entryText, kbText, kwMatch, matchedKeywords } from "@/lib/match/keywords";
import { splitSkills } from "@/lib/patch/validate";
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

export const STANDARD_HEADINGS = ["summary", "profile", "experience", "work experience", "skills", "portfolio", "projects", "education", "certifications and awards", "certifications", "awards", "publications", "referees", "references", "volunteer work", "languages"];
const EXTRA_TERMS = ["Kubernetes", "Java", "Rust", "Kafka", "Angular", "Vue"];
const NUM = /\b\d[\d,.]*\s?(?:%|ms|s\b|M\b|k\b)?/g;
/** Number tokens as written ("4.2s", "40%", "3,100"), without spaces or a closing full stop; years (19xx, 20xx) don't count. */
const numbers = (text: string) =>
  (text.match(NUM) ?? []).map((n) => n.replace(/\s/g, "").replace(/[.,]+$/, "")).filter((n) => !/^(19|20)\d{2}$/.test(n));

export function runChecks(doc: CheckDoc, brief: Pick<JobBrief, "keywords"> & Partial<Pick<JobBrief, "requirements">>, kb: KnowledgeBase, notes = ""): Checks {
  const visible = doc.sections.filter((s) => !s.hidden);
  const matched = matchedKeywords(visible.map(sectionText).join(" "), brief.keywords);
  const facts = `${kbText(kb)} ${notes}`; // notes count as facts the user supplied
  const missing = brief.keywords.filter((k) => !matched.includes(k)).map((keyword) => ({ keyword, inKb: kwMatch(facts, keyword) }));
  const findings: Finding[] = [];

  for (const s of visible) {
    // Only words the user can reword: an employer or project named "Dynamic …" is a fact, not filler.
    const text = "text" in s ? s.text : s.items.flatMap((i) => [i.line ?? "", ...(i.bullets ?? []).map((b) => b.text)]).join("\n");
    for (const [ph, re] of BANNED)
      if (re.test(text)) findings.push({ type: "banned", sectionId: s.id, title: `"${ph}" is on the banned-phrase list`, detail: `Found in ${s.title}. Phrases like this read as generic or AI-written.` });
  }

  const sources = new Map([...kb.roles, ...(kb.volunteering ?? []), ...kb.portfolio].flatMap((owner) => owner.highlights.map((h) => [h.id, { h, owner }] as const)));
  const kbSkills = kb.skills.flatMap((g) => g.items);
  const known = [...new Set([...kbSkills, ...brief.keywords, ...EXTRA_TERMS])].filter((t) => t.length > 2);
  const skillSet = new Set(kbSkills.map((k) => k.toLowerCase()));
  const factNumbers = new Set(numbers(facts));
  const adNumbers = new Set(numbers((brief.requirements ?? []).join(" "))); // a cover letter's Fit paragraph quotes the ad (SPEC §8.4)

  for (const s of visible) {
    const ground = (title: string, detail: string, bulletId?: string) => findings.push({ type: "grounding", sectionId: s.id, ...(bulletId && { bulletId }), title, detail });
    if ("text" in s) {
      for (const n of numbers(s.text)) if (!factNumbers.has(n) && !(s.kind === "paragraph" && adNumbers.has(n))) ground(`"${n}" doesn't appear in your knowledge base`, `In ${s.title}.`);
      continue;
    }
    if (s.kind === "skills")
      for (const it of s.items)
        for (const sk of splitSkills(it.line ?? ""))
          if (!skillSet.has(sk.toLowerCase())) ground(`Skill "${sk}" isn't in your knowledge base`, "Every claim needs a stored fact. Add the skill to your knowledge base or remove it here.");
    for (const b of s.items.flatMap((it) => it.bullets ?? [])) {
      const src = sources.get(b.source);
      if (!src) {
        ground("Bullet has no source in your knowledge base", `"${b.text.slice(0, 70)}…"`, b.id);
        continue;
      }
      const { h, owner } = src;
      const under = `Under ${"company" in owner ? owner.company : owner.name}.`;
      const has = new Set(numbers(`${h.text} ${h.metric ?? ""}`));
      for (const n of numbers(b.text)) if (!has.has(n)) ground(`"${n}" doesn't match your knowledge base`, `${under} Your knowledge base says: "${h.text}"`, b.id);
      const recorded = `${h.text} ${h.skills.join(" ")} ${entryText(owner)}`; // the highlight, or anywhere in its entry
      for (const t of known) if (kwMatch(b.text, t) && !kwMatch(recorded, t)) ground(`Mentions ${t}, which this role doesn't record`, `${under} Add it to the role in your knowledge base if it's true.`, b.id);
    }
  }

  // The templates are single-column, selectable text with contact details in the body, so only headings can fail.
  const standard = doc.kind === "coverLetter" || visible.every((s) => STANDARD_HEADINGS.includes(s.title.trim().toLowerCase()));
  const parse = [
    { label: "Single-column layout", ok: true },
    { label: "Selectable text in reading order", ok: true },
    { label: "Standard section headings", ok: standard, hint: "Rename unusual headings so job sites can find them" },
    { label: "No tables, columns or images", ok: true },
    { label: "Contact details in the page body", ok: true },
  ];
  return { matched, missing, findings, parse };
}
