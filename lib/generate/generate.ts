import { z } from "zod";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { outputError } from "@/lib/llm/errors";
import { GENERATION, validatePatch } from "@/lib/patch/validate";
import type { JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";
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
};
type Draft = ReturnType<typeof buildSkeleton>["resume"];

const SYSTEM = `You tailor a resume and cover letter to a job, filling the empty skeletons you are given with JSON Patch operations.
Allowed operations, and nothing else:
- {"op":"replace","path":"<a path ending /text>","value":"..."} for the summary and each cover letter paragraph.
- {"op":"add","path":"<a path ending /bullets/->","value":{"text":"...","source":"<highlight id>"}} for each bullet.
- {"op":"replace","path":"<a path ending /line>","value":"..."} to reorder a skills line: the same skills, most relevant first.
Rules:
- Use only facts in the knowledge base. Never invent employers, dates, numbers, skills or tools. Numbers in a bullet must appear in its source highlight.
- Each bullet comes from exactly one highlight of the entry it sits under, and its source is that highlight's id. Rephrase lightly to bring the job's keywords forward; never add claims the highlight doesn't support.
- Give each experience entry its 2 to 5 most relevant highlights (more for recent roles) and each portfolio entry 1 or 2. A highlight whose evidenceFor matches a job requirement was added for this job, so always include it.
- Notes are facts the user supplied for this job (motivation, emphasis, referral). Use them in the cover letter and for emphasis in the summary; never as bullets.
- Summary: 2 to 3 sentences: years of experience and focus, one or two proof points from the highlights, what they would bring to the team at the company.
- Cover letter, 4 paragraphs under 300 words in total: Opening (the role, the company, the current role); Evidence (the two strongest relevant highlights); Fit (quote two requirements from the ad and connect them to earlier experience); Close (the work rights phrase, the notice period if known, thanks). The template adds the greeting and sign-off, so leave them out.
- Work rights phrases: "I'm an Australian citizen", "I'm a permanent resident of Australia", "I'm a New Zealand citizen with full work rights in Australia", "I hold a temporary visa with full work rights", "I hold a temporary visa with limited work rights", "I would need visa sponsorship". Leave work rights out if the knowledge base has none.
- Plain, specific, active voice. No filler such as "passionate", "results-driven", "team player", "go-getter" or "synergy".
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
              if (s.kind === "skills") return [`  ${at}/line  ${item.heading}: ${item.line}`];
              return [`  (fixed) entry ${item.ref}: ${name}`];
            }),
          ]
    )
    .join("\n");
}

function prompt({ kb, brief, selected, notes, tone, spelling }: GenerateInput, skeleton: ReturnType<typeof buildSkeleton>) {
  const ids = new Set(selected);
  const entries = [...kb.roles, ...(kb.volunteering ?? []), ...kb.portfolio, ...kb.education, ...kb.credentials, ...(kb.additional ?? [])].filter((e) => ids.has(e.id));
  const facts = { name: kb.contact.name, location: kb.contact.location, workRights: kb.workRights ?? null, entries, skills: kb.skills };
  return [
    `<brief>\n${JSON.stringify(brief)}\n</brief>`,
    `<knowledge-base>\n${JSON.stringify(facts)}\n</knowledge-base>`,
    notes?.trim() ? `<notes>\n${notes.trim()}\n</notes>` : "",
    `<resume-skeleton>\n${outline(skeleton.resume)}\n</resume-skeleton>`,
    `<cover-letter-skeleton>\n${outline(skeleton.coverLetter)}\n</cover-letter-skeleton>`,
    `Tone: ${TONES[tone]} Spelling: ${SPELLING[spelling]}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Both documents, filled and validated, plus the number of operations applied. Retries once if the patch is rejected. */
export async function generateDocuments(input: GenerateInput, adapter: LlmAdapter, signal?: AbortSignal): Promise<{ resume: Draft; coverLetter: Draft; count: number }> {
  const skeleton = buildSkeleton(input.kb, input.brief, input.selected, THEME_DEFAULTS);
  const args = { name: "generate", schema: generationSchema, system: SYSTEM, prompt: prompt(input, skeleton), maxOutputTokens: 8000, signal };
  let reason = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const { object } = await adapter.generateObject(args);
    const rules = { rules: GENERATION, kb: input.kb };
    const resume = validatePatch(skeleton.resume, object.resumeOps, rules);
    const letter = validatePatch(skeleton.coverLetter, object.coverLetterOps, rules);
    if (resume.ok && letter.ok) return { resume: resume.doc, coverLetter: letter.doc, count: resume.count + letter.count };
    reason = (!resume.ok && resume.reason) || (!letter.ok && letter.reason) || "";
  }
  throw outputError(reason);
}
