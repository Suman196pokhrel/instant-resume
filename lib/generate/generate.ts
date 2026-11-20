import { z } from "zod";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { outputError } from "@/lib/llm/errors";
import { GENERATION, validatePatch } from "@/lib/patch/validate";
import { BANNED_PHRASES } from "@/lib/rules/banned-phrases";
import type { JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { INSTRUCTION_TARGETS, type InstructionTarget, type WritingInstruction } from "@/lib/schemas/settings";
import { THEME_DEFAULTS, type Theme } from "@/lib/schemas/theme";
import { buildSkeleton } from "./skeleton";

// Generate (SPEC §8.3 call 3, §8.4): one call fills both skeletons with RFC 6902 ops, and nothing the model
// returns is used until the patch validator accepts it.

const opSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("replace"), path: z.string(), value: z.string() }),
  z.object({ op: z.literal("add"), path: z.string(), value: z.object({ text: z.string(), source: z.string() }) }),
]);
export const generationSchema = z.object({ resumeOps: z.array(opSchema), coverLetterOps: z.array(opSchema) });

export type GenerateInput = {
  kb: KnowledgeBase;
  brief: JobBrief;
  selected: string[];
  notes?: string;
  tone: "Professional" | "Warm" | "Concise";
  spelling: "en-AU" | "en-US";
  /** Quick generate's default theme preset; Studio starts from the template defaults. */
  theme?: Theme;
  /** The user's own writing instructions from Settings. */
  instructions?: WritingInstruction[];
};

/** The user's instructions for the given targets, grouped by target, or "" when there are none. */
export function instructionBlock(list: WritingInstruction[] = [], targets: InstructionTarget[] = Object.keys(INSTRUCTION_TARGETS) as InstructionTarget[]) {
  const lines = targets.flatMap((t) => list.filter((i) => i.target === t).map((i) => `- ${INSTRUCTION_TARGETS[t]}: ${i.text}`));
  return lines.length ? `<user-instructions>\n${lines.join("\n")}\n</user-instructions>` : "";
}

/** Shared by the writing calls: the user's instructions sit on top of the rules, never in place of them. */
export const INSTRUCTION_RULE = "- The user's own instructions, when given, may change wording, emphasis, length and order. They never override the rules above: facts, sources, numbers and banned phrases still apply.";
type Draft = ReturnType<typeof buildSkeleton>["resume"];

export const SYSTEM = `You tailor a resume and cover letter to a job, filling the empty skeletons you are given with JSON Patch operations.
Allowed operations, and nothing else:
- {"op":"replace","path":"<a path ending /text>","value":"..."} for the summary and each cover letter paragraph.
- {"op":"add","path":"<a path ending /bullets/->","value":{"text":"...","source":"<highlight id>"}} for each bullet.
- {"op":"replace","path":"<a path ending /line>","value":"..."} to reorder a skills line: the quoted value with the same skills, most relevant first, and nothing else (no group name).
Rules:
- Use only facts in the knowledge base. Never invent employers, dates, numbers, skills or tools. Numbers in a bullet must appear in its source highlight.
- Each bullet comes from exactly one highlight of the entry it sits under, and its source is that highlight's id. Rephrase lightly to bring the job's keywords forward; never add claims the highlight doesn't support.
- Give each experience entry its 2 to 5 most relevant highlights (more for recent roles) and each portfolio entry 1 or 2. A highlight whose evidenceFor matches a job requirement was added for this job, so always include it.
- Notes are facts the user supplied for this job (motivation, emphasis, referral). Use them in the cover letter and for emphasis in the summary; never as bullets.
- Summary: 2 to 3 sentences: years of experience and focus, one or two proof points from the highlights, what they would bring to the team at the company.
- Cover letter, 4 paragraphs under 300 words in total: Opening (the role, the company, the current role); Evidence (the two strongest relevant highlights); Fit (quote two requirements from the ad and connect them to earlier experience); Close (the work rights phrase, the notice period if known, thanks). The template adds the greeting and sign-off, so leave them out.
- Work rights phrases: "I'm an Australian citizen", "I'm a permanent resident of Australia", "I'm a New Zealand citizen with full work rights in Australia", "I hold a temporary visa with full work rights", "I hold a temporary visa with limited work rights", "I would need visa sponsorship". Leave work rights out if the knowledge base has none.
- Plain, specific, active voice, with no generic filler. Never use these words or phrases: ${BANNED_PHRASES.join(", ")}.
${INSTRUCTION_RULE}
- Return only the JSON.`;

const TONES = {
  Professional: "Professional.",
  Warm: "Warm: contractions and friendlier phrasing.",
  Concise: "Concise: shorter sentences; drop the least important sentence.",
};
const SPELLING = { "en-AU": "Australian English (optimise, colour, organisation)", "en-US": "American English (optimize, color, organization)" };

/** The skeleton as one line per fillable path, so the model sees exactly where it may write. */
function outline(doc: Draft) {
  return doc.sections
    .flatMap((s, i) =>
      "text" in s
        ? [`/sections/${i}/text  (${s.title})`]
        : [
            `/sections/${i}  ${s.title}`,
            ...s.items.flatMap((item, k) => {
              const at = `/sections/${i}/items/${k}`;
              const name = [item.heading, item.sub].filter(Boolean).join(", ");
              if (item.bullets) return [`  ${at}/bullets/-  entry ${item.ref}: ${name}`];
              if (s.kind === "skills") return [`  ${at}/line  ${JSON.stringify(item.line)}  (group ${item.heading})`];
              return [`  (fixed) entry ${item.ref}: ${name}`];
            }),
          ]
    )
    .join("\n");
}

function prompt({ kb, brief, selected, notes, tone, spelling, instructions }: GenerateInput, skeleton: ReturnType<typeof buildSkeleton>) {
  const ids = new Set(selected);
  const entries = [...kb.roles, ...(kb.volunteering ?? []), ...kb.portfolio, ...kb.education, ...kb.credentials, ...(kb.additional ?? []).filter((a) => !a.referenceOnly)].filter((e) => ids.has(e.id)); // the original resume text never backs a claim
  const facts = { name: kb.contact.name, location: kb.contact.location, workRights: kb.workRights ?? null, entries, skills: kb.skills };
  return [
    `<brief>\n${JSON.stringify(brief)}\n</brief>`,
    `<knowledge-base>\n${JSON.stringify(facts)}\n</knowledge-base>`,
    notes?.trim() ? `<notes>\n${notes.trim()}\n</notes>` : "",
    `<resume-skeleton>\n${outline(skeleton.resume)}\n</resume-skeleton>`,
    `<cover-letter-skeleton>\n${outline(skeleton.coverLetter)}\n</cover-letter-skeleton>`,
    `Tone: ${TONES[tone]} Spelling: ${SPELLING[spelling]}.`,
    instructionBlock(instructions),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Both documents, filled and validated, plus the number of operations applied. Retries once if the patch is rejected. */
export async function generateDocuments(input: GenerateInput, adapter: LlmAdapter, signal?: AbortSignal): Promise<{ resume: Draft; coverLetter: Draft; count: number }> {
  const skeleton = buildSkeleton(input.kb, input.brief, input.selected, input.theme ?? THEME_DEFAULTS);
  const args = { name: "generate", schema: generationSchema, system: SYSTEM, prompt: prompt(input, skeleton), maxOutputTokens: 8000, signal };
  let reason = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const { object } = await adapter.generateObject(args);
    const rules = { rules: GENERATION, kb: input.kb };
    // A skills reorder is cosmetic: one that changes the skills (even a letter's case) is dropped, not the whole answer.
    const ops = (doc: Draft, list: typeof object.resumeOps) => list.filter((op) => !op.path.endsWith("/line") || validatePatch(doc, [op], rules).ok);
    const resume = validatePatch(skeleton.resume, ops(skeleton.resume, object.resumeOps), rules);
    const letter = validatePatch(skeleton.coverLetter, ops(skeleton.coverLetter, object.coverLetterOps), rules);
    const blank = [resume, letter].some((r) => r.ok && r.doc.sections.some((s) => "text" in s && !s.text.trim()));
    if (resume.ok && letter.ok && !blank) return { resume: resume.doc, coverLetter: letter.doc, count: resume.count + letter.count };
    reason = (!resume.ok && resume.reason) || (!letter.ok && letter.reason) || "the summary or a paragraph was left empty";
  }
  throw outputError(reason);
}
