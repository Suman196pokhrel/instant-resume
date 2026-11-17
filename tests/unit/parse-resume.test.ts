import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/import/parse";

// SPEC §14.1a: a basic local parser for pasted text and TXT files. Nothing is invented; nothing is dropped.
const RESUME = `Riley Ng
riley.ng@example.com | 0412 555 123
Hobart TAS

EXPERIENCE
Support Engineer | Harbour Health
• Answered 40 tickets a day
- Wrote the on-call runbook

VOLUNTEER WORK
Mentor | Code Club Australia
Ran weekly coding sessions for 20 students

EDUCATION
Bachelor of IT | University of Tasmania
Distinction average

SKILLS
React, TypeScript; Node.js (Express, Fastify)

PROJECTS
Tidewatch | Tide alerts for kayakers

CERTIFICATIONS
AWS Certified Developer

AWARDS
Hackathon winner 2022

REFERENCES
Dana Okafor | Engineering Manager
dana@example.com

WORK RIGHTS
Permanent resident

LANGUAGES
English, Vietnamese
`;

describe("parseResume", () => {
  const d = parseResume(RESUME);

  it("reads contact details from the top without inventing a location", () => {
    expect(d.contact).toEqual({ id: "kb-contact", name: "Riley Ng", email: "riley.ng@example.com", phone: "0412 555 123" });
  });

  it("turns 'Title | Organisation' blocks and bullet lines into entries with highlights, leaving dates blank", () => {
    expect(d.roles).toEqual([
      { title: "Support Engineer", company: "Harbour Health", highlights: [{ text: "Answered 40 tickets a day", skills: [] }, { text: "Wrote the on-call runbook", skills: [] }] },
    ]);
    expect(d.volunteering).toEqual([{ title: "Mentor", company: "Code Club Australia", highlights: [{ text: "Ran weekly coding sessions for 20 students", skills: [] }] }]);
    expect(d.education).toEqual([{ degree: "Bachelor of IT", institution: "University of Tasmania", notes: "Distinction average" }]);
    expect(d.skills).toEqual([{ group: "SKILLS", items: ["React", "TypeScript", "Node.js (Express, Fastify)"] }]);
    expect(d.portfolio).toEqual([{ name: "Tidewatch", summary: "Tide alerts for kayakers", highlights: [] }]);
    expect(d.credentials).toEqual([
      { kind: "Certification", title: "AWS Certified Developer" },
      { kind: "Award", title: "Hackathon winner 2022" },
    ]);
    expect(d.referees).toEqual([{ name: "Dana Okafor", title: "Engineering Manager", contact: "dana@example.com" }]);
  });

  it("never infers work rights, and keeps unknown sections and the original text as Additional sections", () => {
    expect(d.workRights).toBeUndefined();
    expect(d.additional).toEqual([
      { title: "Contact and introductory details", notes: "Riley Ng\nriley.ng@example.com | 0412 555 123\nHobart TAS", referenceOnly: true },
      { title: "WORK RIGHTS", notes: "Permanent resident" },
      { title: "LANGUAGES", notes: "English, Vietnamese" },
      { title: "Original resume text (reference)", notes: RESUME, referenceOnly: true },
    ]);
  });

  it("keeps only the original text when nothing is recognised", () => {
    const only = parseResume("just some words here, nothing else at all");
    expect(only.roles).toEqual([]);
    expect(only.additional.at(-1)).toEqual({ title: "Original resume text (reference)", notes: "just some words here, nothing else at all", referenceOnly: true });
  });
});
