import { z } from "zod";
import type { LlmAdapter } from "@/lib/llm/adapter";
import { suggestSelection } from "@/lib/match/keywords";
import type { JobBrief } from "@/lib/schemas/brief";
import type { KnowledgeBase } from "@/lib/schemas/kb";

// Match (SPEC §8.3 call 2): Quick generate only. The model links each must-have to KB evidence by ID; IDs it makes
// up are dropped before anything uses them, and a must-have left without evidence is a gap. Notes are never sent,
// so they can't close one.

export const matchSchema = z.object({
  requirements: z.array(z.object({ requirement: z.string(), evidence: z.array(z.string()) })),
  suggestedEntryIds: z.array(z.string()),
});
export type Match = { requirements: { requirement: string; evidence: string[] }[]; selected: string[]; gaps: string[] };

export const SYSTEM = `You match a job's must-haves to evidence in a candidate's knowledge base and return JSON.
- requirements: one item per must-have, with its exact text, and evidence: the IDs of the highlights (or entries) that show it. Use an empty list when nothing in the knowledge base shows it.
- Skills, tools, qualifications and domains need a highlight or entry that names them; never stretch. Years of experience need roles whose dates add up to at least the minimum asked; cite those roles, or none.
- Behaviours and attitudes (learning quickly, teamwork, communication, working across locations, problem solving) are shown by what the candidate did: cite the highlights where that behaviour happens, such as adopting a new stack, leading or working in a team, or working remotely with other roles.
- suggestedEntryIds: the entry IDs worth including in a resume for this job.
- Use only IDs from the knowledge base.`;

const ENTRY_LISTS = ["roles", "volunteering", "portfolio", "education", "credentials", "referees", "additional"] as const;

export async function matchEvidence(brief: JobBrief, kb: KnowledgeBase, adapter: LlmAdapter, signal?: AbortSignal): Promise<Match> {
  const entries = ENTRY_LISTS.flatMap((k) => (kb[k] ?? []) as { id: string; highlights?: { id: string }[] }[]).filter((e) => !(e as { referenceOnly?: boolean }).referenceOnly);
  const owner = new Map(entries.flatMap((e) => [[e.id, e.id] as const, ...(e.highlights ?? []).map((h) => [h.id, e.id] as const)]));
  const facts = { entries, skills: kb.skills };
  // The knowledge base first: it's the same for every job, so the next match reads it from the prompt cache.
  const cachePrefix = `<knowledge-base>\n${JSON.stringify(facts)}\n</knowledge-base>\n\n`;
  const prompt = cachePrefix + `<brief>\n${JSON.stringify({ title: brief.title, company: brief.company, mustHaves: brief.requirements, keywords: brief.keywords })}\n</brief>`;
  const { object } = await adapter.generateObject({ name: "match", schema: matchSchema, system: SYSTEM, prompt, cachePrefix, signal });

  const given = new Map(object.requirements.map((r) => [r.requirement.trim().toLowerCase(), r.evidence]));
  const requirements = brief.requirements.map((requirement) => ({ requirement, evidence: [...new Set(given.get(requirement.toLowerCase()) ?? [])].filter((id) => owner.has(id)) }));
  const evidenceOwners = requirements.flatMap((r) => r.evidence.map((id) => owner.get(id)!));
  const suggested = object.suggestedEntryIds.filter((id) => owner.get(id) === id);
  return {
    requirements,
    selected: [...new Set([...suggestSelection(kb, brief.keywords), ...suggested, ...evidenceOwners])],
    gaps: requirements.filter((r) => !r.evidence.length).map((r) => r.requirement),
  };
}
