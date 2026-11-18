import type { LlmAdapter } from "@/lib/llm/adapter";
import { kwMatch } from "@/lib/match/keywords";
import { briefSchema, type JobBrief } from "@/lib/schemas/brief";

// Extract brief (SPEC §8.3 call 1, §6.2): the one LLM call in Studio setup. Keywords must come from the ad.

const SYSTEM = `You read a job ad and return its job brief as JSON.
- title, company, location and team come from the ad; team only if the ad names one.
- seniority is one of Junior, Mid-level, Senior, Lead, judged from the title and the years asked for.
- requirements: the must-haves, 3 to 8 short phrases in the ad's own words.
- niceToHave: the optional extras, short phrases.
- keywords: 8 to 15 short terms of one to three words (a skill, tool or practice, like "React", "PostgreSQL", "Testing" or "Mentoring") that the ad asks for, must-haves and nice-to-haves alike. Use the ad's own word for each; never a whole phrase like "performance and reliability".
- workRights: what the ad says about work rights or visas, or "Not stated".
- Use only what the ad says. Never invent requirements.`;

const stem = (k: string) => (k.length > 5 ? k.replace(/(ing|ed|es|s)$/i, "") : k);

/** A keyword the ad actually uses: the term itself, or its stem ("Testing" for an ad that says "tests"). */
export function inAd(ad: string, keyword: string): boolean {
  if (kwMatch(ad, keyword)) return true;
  const s = stem(keyword.toLowerCase()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return s.length >= 4 && new RegExp(`(?<![a-z0-9])${s}`).test(ad.toLowerCase());
}

export async function extractBrief(ad: string, adapter: LlmAdapter, signal?: AbortSignal): Promise<JobBrief> {
  const { object } = await adapter.generateObject({ name: "brief", schema: briefSchema, system: SYSTEM, prompt: `<job-ad>\n${ad}\n</job-ad>`, signal });
  return { ...object, keywords: [...new Set(object.keywords.map((k) => k.trim()))].filter((k) => k && inAd(ad, k)) }; // grounding: drop keywords the ad never uses
}
