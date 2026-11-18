import { toExtraction } from "@/lib/import/extract";
import { parseResume } from "@/lib/import/parse";
import type { GenerateArgs, LlmAdapter } from "./adapter";
import { LlmError, outputError } from "./errors";

// SPEC §8.1 MockLlmAdapter and §17 scenarios. Deterministic and offline: every automated test runs on it
// (NEXT_PUBLIC_LLM_MOCK=1). Each call's fixture arrives with that call (brief, match, generate, rewrite).

export const SCENARIOS = ["happy", "gaps", "findings", "error-stage-1", "error-stage-2", "error-stage-3", "error-stage-4", "error-stage-5", "extract-error", "brief-error", "generate-error"] as const;
export type Scenario = (typeof SCENARIOS)[number];
export type Fixture = (args: GenerateArgs<unknown>, scenario: Scenario) => unknown;

let extractFailed = false; // extract-error fails the first extract call only, so Try again succeeds
let briefFailed = false; // brief-error: the same for the brief call
let generateFailed = false; // generate-error: the same for the generate call

const busy = () => new LlmError("busy", "Anthropic is having trouble right now", "This is on Anthropic's side. Try again in a few minutes, or switch to another model.", "529 overloaded_error");
const TECH = ["React", "TypeScript", "JavaScript", "Node.js", "Python", "Go", "Java", "PostgreSQL", "SQL", "GraphQL", "AWS", "Azure", "GCP", "Kubernetes", "Docker", "Terraform", "Redis", "Accessibility", "Testing", "CI/CD"];

/** SPEC §17's Mintleaf brief for the Mintleaf ad; for any other ad, a plain brief from its first lines and bullets. */
function briefFor(ad: string) {
  if (/Mintleaf/.test(ad)) {
    return {
      title: "Senior Full Stack Engineer",
      company: "Mintleaf",
      location: "Melbourne VIC",
      seniority: "Senior",
      requirements: ["5+ years building web apps", "React, TypeScript and Node.js", "Strong SQL and PostgreSQL", "AWS in production", "Mentoring and technical leadership"],
      niceToHave: ["GraphQL", "Terraform", "Accessibility"],
      keywords: ["React", "TypeScript", "Node.js", "PostgreSQL", "SQL", "AWS", "Performance", "Testing", "Mentoring", "GraphQL", "Terraform", "Accessibility"],
      workRights: "Full working rights in Australia are required",
    };
  }
  const lines = ad.split("\n").map((l) => l.trim()).filter(Boolean);
  const [company = "", location = ""] = (lines[1] ?? "").split(/,\s*/);
  return {
    title: lines[0] ?? "",
    company,
    location,
    seniority: /senior/i.test(lines[0] ?? "") ? "Senior" : "Mid-level",
    requirements: lines.filter((l) => /^[-•*]/.test(l)).map((l) => l.replace(/^[-•*]\s*/, "")).slice(0, 8),
    niceToHave: [],
    keywords: TECH.filter((t) => new RegExp(`(?<![a-z0-9])${t.replace(/[.+/]/g, "\\$&")}(?![a-z0-9])`, "i").test(ad)),
    workRights: "Not stated",
  };
}

const block = (prompt: string, tag: string) => prompt.match(new RegExp(`<${tag}>\\n([\\s\\S]*?)\\n</${tag}>`))?.[1] ?? "";

/** Fills whatever skeleton the prompt carries from its own knowledge base, so it fits any KB (the shared e2e one changes). */
function generationFor(prompt: string) {
  const brief = JSON.parse(block(prompt, "brief") || "{}");
  const kb = JSON.parse(block(prompt, "knowledge-base") || "{}") as { name?: string; entries?: { id: string; highlights?: { id: string; text: string }[] }[] };
  const highlights = new Map((kb.entries ?? []).map((e) => [e.id, e.highlights ?? []]));
  const evidence = [...highlights.values()].flat().slice(0, 2).map((h) => h.text);
  const PARAGRAPHS: Record<string, string> = {
    Opening: `I'm applying for the ${brief.title} role at ${brief.company}.`,
    Evidence: evidence.join(" ") || "My experience is set out in my resume.",
    Fit: `Your ad asks for ${(brief.requirements ?? []).slice(0, 2).join(" and ") || "relevant experience"}, which matches my recent work.`,
    Close: "Thank you for considering my application.",
  };
  const ops = (skeleton: string) =>
    skeleton.split("\n").flatMap((line): object[] => {
      const text = line.match(/^(\/sections\/\d+\/text) {2}\((.+)\)$/);
      if (text) return [{ op: "replace", path: text[1], value: PARAGRAPHS[text[2]] ?? `${kb.name ?? "Engineer"}, applying for the ${brief.title} role at ${brief.company}.` }];
      const list = line.match(/^ +(\/sections\/\d+\/items\/\d+\/bullets\/-) {2}entry (\S+):/);
      return list ? (highlights.get(list[2]) ?? []).slice(0, 3).map((h) => ({ op: "add", path: list[1], value: { text: h.text, source: h.id } })) : [];
    });
  return { resumeOps: ops(block(prompt, "resume-skeleton")), coverLetterOps: ops(block(prompt, "cover-letter-skeleton")) };
}

export const MOCK_FIXTURES: Record<string, Fixture> = {
  ping: (_args, scenario) => ({ ok: true, scenario }),
  // The on-device parser's reading of the resume, so tests see the uploaded file's own details reach Review.
  extract: ({ prompt }, scenario) => {
    if (scenario === "extract-error" && !extractFailed) {
      extractFailed = true;
      throw busy();
    }
    return toExtraction(parseResume(prompt.match(/^<resume>\n([\s\S]*)\n<\/resume>$/)?.[1] ?? ""));
  },
  brief: ({ prompt }, scenario) => {
    if (scenario === "brief-error" && !briefFailed) {
      briefFailed = true;
      throw busy();
    }
    return briefFor(prompt.match(/^<job-ad>\n([\s\S]*)\n<\/job-ad>$/)?.[1] ?? "");
  },
  generate: ({ prompt }, scenario) => {
    if (scenario === "generate-error" && !generateFailed) {
      generateFailed = true;
      throw busy();
    }
    return generationFor(prompt);
  },
};

/** The scenario from `?mock=` (SPEC §17), or "happy". */
export function mockScenario(search = typeof location === "undefined" ? "" : location.search): Scenario {
  const s = new URLSearchParams(search).get("mock");
  return SCENARIOS.find((x) => x === s) ?? "happy";
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
    if (signal?.aborted) return abort();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), abort()), { once: true });
  });

export function createMockAdapter({ fixtures, scenario, delayMs = 0 }: { fixtures: Record<string, Fixture>; scenario: Scenario; delayMs?: number }): LlmAdapter {
  return {
    async generateObject(args) {
      await wait(delayMs, args.signal);
      const fixture = fixtures[args.name];
      if (!fixture) throw new LlmError("other", "Something went wrong with the mock provider", "Try again in a moment.", `no mock fixture for ${args.name}`);
      const parsed = args.schema.safeParse(fixture(args, scenario));
      if (!parsed.success) throw outputError();
      return { object: parsed.data, usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };
}
