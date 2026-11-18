import { z } from "zod";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { outputError } from "@/lib/llm/errors";
import { kbText, kwMatch } from "@/lib/match/keywords";
import { rewriteRules, validatePatch, type Op } from "@/lib/patch/validate";
import { BANNED_PHRASES } from "@/lib/rules/banned-phrases";
import type { JobBrief } from "@/lib/schemas/brief";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import { LIST_KEYS, type KnowledgeBase } from "@/lib/schemas/kb";

// Rewrite (SPEC §8.3 call 4): one section and an instruction in, JSON Patch ops for that section out. Nothing the
// model returns is shown until the patch validator accepts it.

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("replace"), path: z.string(), value: z.string() }),
  z.object({ op: z.literal("add"), path: z.string(), value: z.object({ text: z.string(), source: z.string() }) }),
  z.object({ op: z.literal("remove"), path: z.string() }),
  z.object({ op: z.literal("move"), from: z.string(), path: z.string() }),
]);
export const rewriteSchema = z.object({ ops: z.array(opSchema), note: z.string() }); // note "" = none: strict output has no optional fields

export type RewriteInput = {
  doc: ResumeDocument;
  resume?: ResumeDocument; // a summary or paragraph has no entries of its own, so it is grounded in the resume's
  sectionId: string;
  instruction: string;
  kb: KnowledgeBase;
  brief: JobBrief;
  notes?: string;
  tone: "Professional" | "Warm" | "Concise";
  spelling: "en-AU" | "en-US";
};

const SYSTEM = `You rewrite one section of a resume or cover letter as the user asks, with JSON Patch operations on that section only.
Allowed operations, and nothing else:
- {"op":"replace","path":"<a listed path ending /text or /line>","value":"..."} to reword text, a bullet, or reorder a skills line (same skills, nothing else).
- {"op":"move","from":"<bullet path>","path":"<bullet path in the same list>"} to reorder bullets.
- {"op":"add","path":"<a listed path ending /bullets/0 or /bullets/->","value":{"text":"...","source":"<highlight id>"}} to bring in a highlight of that entry.
- {"op":"remove","path":"<bullet path>"} to drop a bullet. Never replace a bullet with empty text.
Rules:
- Use only facts in the knowledge base and the section itself. Never invent employers, dates, numbers, skills or tools. Numbers in a bullet must appear in its source highlight.
- A new bullet comes from exactly one highlight of the entry it sits under, and its source is that highlight's id.
- Change only what the instruction asks for. If it can't be done without inventing facts, return no operations and say why in note.
- Plain, specific, active voice, with no generic filler. Never use these words or phrases: ${BANNED_PHRASES.join(", ")}.
- Return only the JSON.`;

const TONES = { Professional: "Professional.", Warm: "Warm: contractions and friendlier phrasing.", Concise: "Concise: shorter sentences." };
const SPELLING = { "en-AU": "Australian English (optimise, colour, organisation)", "en-US": "American English (optimize, color, organization)" };

/** The section as one line per editable path, with its current value. */
function outline(s: Section, i: number) {
  const at = `/sections/${i}`;
  if ("text" in s) return `${at}/text  (${s.title})  ${JSON.stringify(s.text)}`;
  return [
    `${at}  ${s.title}`,
    ...s.items.flatMap((item, k) => {
      const it = `${at}/items/${k}`;
      const name = [item.heading, item.sub].filter(Boolean).join(", ");
      if (item.bullets)
        return [`  ${it}  entry ${item.ref}: ${name}`, ...item.bullets.map((b, j) => `    ${it}/bullets/${j}/text  [${b.source}]  ${JSON.stringify(b.text)}`), `    ${it}/bullets/-  (add)`];
      if (s.kind === "skills") return [`  ${it}/line  ${JSON.stringify(item.line)}  (group ${item.heading})`];
      return [`  (fixed) entry ${item.ref}: ${[name, item.meta, item.line].filter(Boolean).join(" | ")}`];
    }),
  ].join("\n");
}

function request(input: RewriteInput) {
  const { doc, resume, sectionId, instruction, kb, brief, notes, tone, spelling } = input;
  const index = doc.sections.findIndex((s) => s.id === sectionId);
  const section = doc.sections[index];
  if (!section) throw new Error(`no section ${sectionId}`);
  const refs = new Set(("items" in section ? [section] : (resume ?? doc).sections).flatMap((s) => ("items" in s ? s.items.map((i) => i.ref) : [])));
  const entries = LIST_KEYS.flatMap((k) => kb[k] as { id: string; referenceOnly?: boolean }[]).filter((e) => refs.has(e.id) && !e.referenceOnly); // the original resume text never backs a claim
  const facts = { name: kb.contact.name, workRights: kb.workRights ?? null, entries };
  const prompt = [
    `<brief>\n${JSON.stringify(brief)}\n</brief>`,
    `<knowledge-base>\n${JSON.stringify(facts)}\n</knowledge-base>`,
    notes?.trim() ? `<notes>\n${notes.trim()}\n</notes>` : "",
    `<section>\n${outline(section, index)}\n</section>`,
    `<instruction>\n${instruction}\n</instruction>`,
    `Tone: ${TONES[tone]} Spelling: ${SPELLING[spelling]}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { index, section, args: { name: "rewrite", schema: rewriteSchema, system: SYSTEM, prompt, maxOutputTokens: 3000 } };
}

/** The "about N tokens" note for the request this rewrite would send. Measured on Sonnet 5.5 (2026-11-18): about 380
 * for the output schema plus a token per 2 characters, since the JSON knowledge base tokenises densely. */
export function rewriteTokens(input: RewriteInput) {
  const { args } = request(input);
  return Math.round((380 + (args.system.length + args.prompt.length) / 2) / 10) * 10;
}

/** The proposed section and its ops, or null when the validated result is the section unchanged. Retries once if the patch is rejected. */
export async function rewriteSection(input: RewriteInput, adapter: LlmAdapter, signal?: AbortSignal): Promise<{ after: Section; ops: Op[]; note: string } | null> {
  const { index, section, args } = request(input);
  let reason = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const { object } = await adapter.generateObject({ ...args, signal });
    const result = validatePatch(input.doc, object.ops, { rules: rewriteRules(index), kb: input.kb });
    if (result.ok) {
      const after = result.doc.sections[index];
      return JSON.stringify(after) === JSON.stringify(section) ? null : { after, ops: object.ops, note: object.note };
    }
    reason = result.reason;
  }
  throw outputError(reason);
}

/** SPEC §8.3: the example in the no-change message differs from the instruction just sent. */
export function noChangeExample(instruction: string, brief: JobBrief) {
  const options = [brief.keywords[0] && `emphasise ${brief.keywords[0]}`, "lead with metrics", "more concise"].filter(Boolean) as string[];
  return options.find((x) => x.toLowerCase() !== instruction.trim().toLowerCase())!;
}

const EMPHASIS = /(?:emphasi[sz]e|highlight|focus on|more about|mention)\s+(.+)/i;
export const emphasisTerm = (instruction: string) => instruction.match(EMPHASIS)?.[1].replace(/[."']+$/g, "").trim();

/** A term the instruction asks to bring forward that the KB can't back. */
export function rewriteWarnings(instruction: string, kb: KnowledgeBase): string[] {
  const term = emphasisTerm(instruction);
  return term && !kwMatch(kbText(kb), term) ? [`${term} isn't in your knowledge base. If you accept, checks will flag it as an unsupported claim.`] : [];
}
