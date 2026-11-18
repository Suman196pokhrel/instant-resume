import { expect, it, vi } from "vitest";
import { extractResume, toDraft, toExtraction, type Extraction } from "@/lib/import/extract";
import { parseResume } from "@/lib/import/parse";
import type { LlmAdapter } from "@/lib/llm/adapter";

// SPEC §14.1a provider extraction: one call fills the review draft, including the highlight fields later stages reuse.
const empty: Extraction = {
  contact: { name: "", email: "", phone: "", location: "", linkedin: "", github: "" },
  roles: [],
  volunteering: [],
  portfolio: [],
  education: [],
  skills: [],
  credentials: [],
  referees: [],
  additional: [],
};

const extraction: Extraction = {
  ...empty,
  contact: { ...empty.contact, name: "Jordan Whitlock", email: "jordan.whitlock@example.com", location: "Sydney NSW" },
  roles: [
    {
      title: "Senior Software Engineer",
      company: "Brightwater Logistics",
      location: "",
      start: "Mar 2022",
      end: "Present",
      highlights: [
        { text: "Reduced AWS spend by 25% by right-sizing ECS services", metric: "25%", skills: ["AWS", "ECS"] },
        { text: "Mentored three graduates", metric: "40%", skills: [] }, // a metric that isn't in its bullet
        { text: "", metric: "", skills: [] },
      ],
    },
  ],
  skills: [{ group: "Languages", items: ["TypeScript", "Go", "TypeScript", ""] }],
  credentials: [{ kind: "Certification", title: "AWS Certified Developer", issuer: "", year: "2023" }],
  additional: [
    { title: "Work rights", notes: "Australian citizen" },
    { title: "Languages", notes: "English, Spanish" },
  ],
};

it("maps the provider's answer into the review draft, keeping each highlight's metric and skills (AC2)", () => {
  const d = toDraft(extraction, "ORIGINAL TEXT");
  expect(d.contact).toEqual({ id: "kb-contact", name: "Jordan Whitlock", email: "jordan.whitlock@example.com", location: "Sydney NSW" });
  expect(d.roles).toEqual([
    {
      title: "Senior Software Engineer",
      company: "Brightwater Logistics",
      start: "Mar 2022",
      end: "Present",
      highlights: [
        { text: "Reduced AWS spend by 25% by right-sizing ECS services", metric: "25%", skills: ["AWS", "ECS"] },
        { text: "Mentored three graduates", skills: [] },
      ],
    },
  ]);
  expect(d.skills).toEqual([{ group: "Languages", items: ["TypeScript", "Go"] }]);
  expect(d.credentials).toEqual([{ kind: "Certification", title: "AWS Certified Developer", year: "2023" }]);
});

it("never fills work rights; unknown sections and the original text are kept as Additional sections (AC2, AC3)", () => {
  const d = toDraft(extraction, "ORIGINAL TEXT");
  expect(d.workRights).toBeUndefined();
  expect(d.additional).toEqual([
    { title: "Work rights", notes: "Australian citizen" },
    { title: "Languages", notes: "English, Spanish" },
    { title: "Original resume text (reference)", notes: "ORIGINAL TEXT", referenceOnly: true },
  ]);
});

it("sends the resume as one named call with room for a long answer (AC1)", async () => {
  const generateObject = vi.fn().mockResolvedValue({ object: extraction, usage: { inputTokens: 1, outputTokens: 1 } });
  const signal = new AbortController().signal;
  const d = await extractResume("Jordan Whitlock\nEXPERIENCE", { generateObject } as LlmAdapter, signal);
  const args = generateObject.mock.calls[0][0];
  expect(args).toMatchObject({ name: "extract", maxOutputTokens: 16000, signal, prompt: "<resume>\nJordan Whitlock\nEXPERIENCE\n</resume>" });
  expect(args.system).toMatch(/never invent/i);
  expect(args.schema.safeParse(extraction).success).toBe(true);
  expect(d.additional?.at(-1)).toEqual({ title: "Original resume text (reference)", notes: "Jordan Whitlock\nEXPERIENCE", referenceOnly: true });
});

it("round-trips the on-device parser's draft for the mock provider", () => {
  const text = "Sam Lee\nsam@example.com\n\nEXPERIENCE\nSupport Engineer | Harbour Health\n• Answered 40 tickets a day\n\nLANGUAGES\nEnglish";
  const d = toDraft(toExtraction(parseResume(text)), text);
  expect(d.contact).toMatchObject({ name: "Sam Lee", email: "sam@example.com" });
  expect(d.roles).toEqual([{ title: "Support Engineer", company: "Harbour Health", highlights: [{ text: "Answered 40 tickets a day", skills: [] }] }]);
  expect(d.additional?.map((a) => a.title)).toEqual(["LANGUAGES", "Original resume text (reference)"]);
});
