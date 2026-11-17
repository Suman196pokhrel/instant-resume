import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { entrySummary, KB_ORDER, KB_SECTIONS, toEntry, validateFields, type KbSection } from "@/lib/schemas/kb-fields";
import {
  additionalSectionSchema,
  contactSchema,
  credentialSchema,
  educationSchema,
  portfolioItemSchema,
  refereeSchema,
  roleSchema,
  skillGroupSchema,
  volunteerRoleSchema,
  workRightsSchema,
} from "@/lib/schemas/kb";

// SPEC §13.2 field schemas (mock views-app.js KB_SCHEMA), checked against the §6.1 Zod schemas.
const ZOD: Record<KbSection, z.ZodType> = {
  contact: contactSchema,
  workRights: workRightsSchema,
  roles: roleSchema,
  volunteering: volunteerRoleSchema,
  portfolio: portfolioItemSchema,
  education: educationSchema,
  skills: skillGroupSchema,
  credentials: credentialSchema,
  referees: refereeSchema,
  additional: additionalSectionSchema,
};
const IDS: Partial<Record<KbSection, string>> = { contact: "kb-contact", workRights: "kb-rights" };

/** Form values with every required field filled. */
function filled(section: KbSection) {
  return Object.fromEntries(
    KB_SECTIONS[section].fields.filter((f) => f.req).map((f) => [f.k, f.options?.[0] ?? (f.type === "email" ? "a@example.com" : "x")])
  );
}
const parse = (section: KbSection, values: Record<string, string>) =>
  ZOD[section].safeParse({ id: IDS[section] ?? "x-1", ...(KB_SECTIONS[section].highlights ? { highlights: [] } : {}), ...toEntry(section, values) });

describe("KB field schema", () => {
  it("orders sections as the mock's KB_ORDER", () => {
    expect(KB_ORDER).toEqual(["contact", "workRights", "roles", "volunteering", "portfolio", "education", "skills", "credentials", "referees", "additional"]);
    expect(Object.keys(KB_SECTIONS).sort()).toEqual([...KB_ORDER].sort());
  });

  it("agrees with the Zod schemas on which fields are required", () => {
    for (const section of KB_ORDER) {
      expect(parse(section, filled(section)).success, section).toBe(true);
      for (const f of KB_SECTIONS[section].fields) {
        // The form is stricter than the schema here (mock rules): details and at least one skill are required.
        const zodRequires = f.req && !["additional.notes", "skills.items"].includes(`${section}.${f.k}`);
        expect(parse(section, { ...filled(section), [f.k]: "" }).success, `${section}.${f.k}`).toBe(!zodRequires);
      }
    }
  });

  it("needs no dates for volunteer work, and a location for contact", () => {
    expect(validateFields("volunteering", { title: "Mentor", company: "Code Club" })).toEqual({});
    expect(validateFields("contact", { name: "J", email: "j@example.com" })).toEqual({ location: "Enter your location" });
  });

  it("uses the mock's messages", () => {
    expect(validateFields("roles", {})).toEqual({
      title: "Enter your job title",
      company: "Enter your employer",
      start: "Enter your start",
      end: "Enter your end",
    });
    expect(validateFields("skills", { group: "Frontend", items: " " })).toEqual({ items: "Enter your skills" });
    expect(validateFields("contact", { name: "J", email: "nope", location: "Sydney" })).toEqual({ email: "Enter an email like name@example.com" });
  });

  it("splits list fields on commas and trims text", () => {
    expect(toEntry("skills", { group: " Frontend ", items: "React, TypeScript,, Playwright " })).toEqual({ group: "Frontend", items: ["React", "TypeScript", "Playwright"] });
    expect(toEntry("referees", { name: "Dana", contact: "d@example.com" })).toEqual({ name: "Dana", title: "", company: "", contact: "d@example.com" });
  });

  it("summarises entries without stray separators", () => {
    expect(entrySummary("volunteering", { id: "v", title: "Mentor", company: "Code Club", highlights: [] })).toEqual({ title: "Mentor", sub: "Code Club", meta: "" });
    expect(entrySummary("roles", { id: "r", title: "Dev", company: "Acme", location: "Sydney NSW", start: "Mar 2022", end: "Present", highlights: [] })).toEqual({
      title: "Dev",
      sub: "Acme, Sydney NSW",
      meta: "Mar 2022 to Present",
    });
    expect(entrySummary("skills", { id: "s", group: "Frontend", items: ["React"] })).toEqual({ title: "Frontend", chips: ["React"] });
  });
});
