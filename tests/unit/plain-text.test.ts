import { expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { plainText, sectionText } from "@/lib/doc/plain-text";
import { buildSkeleton } from "@/lib/generate/skeleton";
import { kbSchema } from "@/lib/schemas/kb";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";
import type { JobBrief } from "@/lib/schemas/brief";

// SPEC §14.5 Copy: plain text for job sites that ask you to paste (ported from mock docs.js plainText). No LLM.
const kb = kbSchema.parse(structuredClone(fixture));
const brief = { title: "Senior Full Stack Engineer", company: "Mintleaf", location: "Melbourne VIC" } as JobBrief;
const { resume, coverLetter } = buildSkeleton(kb, brief, ["role-brightwater", "ref-dana"], THEME_DEFAULTS);
const summary = resume.sections[0];
if (summary.kind === "summary") summary.text = "Engineer with eight years in web apps.";
const exp = resume.sections[1];
if (exp.kind === "experience") exp.items[0].bullets = [{ id: "b-1", text: "Cut page load from 4.2s to 1.1s", source: "hl-bw-1" }];
coverLetter.sections.forEach((s, i) => s.kind === "paragraph" && (s.text = `Paragraph ${i + 1}.`));

it("a resume: name, contact line, work rights, then each visible section with an upper-case heading", () => {
  const text = plainText(resume, kb, brief, "en-AU");
  const lines = text.split("\n");
  expect(lines[0]).toBe("Jordan Whitlock");
  expect(lines[1]).toBe("Sydney NSW | 0412 345 678 | jordan.whitlock@example.com | linkedin.com/in/jordan-whitlock-example | github.com/jwhitlock-example");
  expect(lines[2]).toBe("Australian citizen");
  expect(text).toContain("\nSUMMARY\nEngineer with eight years in web apps.");
  expect(text).toContain("\nEXPERIENCE\nSenior Software Engineer, Brightwater Logistics (");
  expect(text).toContain("\n• Cut page load from 4.2s to 1.1s");
  expect(text).toContain("\nSKILLS\nLanguages: TypeScript, JavaScript, Python, Go, SQL\n");
  expect(text).toContain("Cloud and tooling: AWS (Lambda, ECS, SQS), Docker, Terraform, GitHub Actions");
  expect(text).toContain("\nREFEREES\nDana Okafor, Engineering Manager, Brightwater Logistics (");
});

it("leaves out hidden sections, and the work rights line outside Australian spelling", () => {
  const hidden = { ...resume, sections: resume.sections.map((s) => (s.kind === "skills" ? { ...s, hidden: true } : s)) };
  const text = plainText(hidden, kb, brief, "en-US");
  expect(text).not.toContain("SKILLS");
  expect(text.split("\n")[2]).toBe("");
});

it("a cover letter adds the Re line, greeting and sign-off", () => {
  expect(plainText(coverLetter, kb, brief, "en-AU")).toBe(
    [
      "Jordan Whitlock",
      "Sydney NSW | 0412 345 678 | jordan.whitlock@example.com | linkedin.com/in/jordan-whitlock-example | github.com/jwhitlock-example",
      "",
      "Re: Senior Full Stack Engineer",
      "",
      "Dear Hiring team,",
      "",
      "Paragraph 1.\n",
      "Paragraph 2.\n",
      "Paragraph 3.\n",
      "Paragraph 4.\n",
      "Kind regards,",
      "Jordan Whitlock",
    ].join("\n")
  );
});

it("one section on its own", () => {
  expect(sectionText(summary)).toBe("Engineer with eight years in web apps.");
});
