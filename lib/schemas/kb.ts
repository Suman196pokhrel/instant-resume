import { z } from "zod";

// Knowledge base (SPEC §6.1). IDs are stable: bullets reference highlight IDs, so never reuse or change one.
export const req = z.string().trim().min(1);
const opt = z.string().optional();

export const WORK_RIGHTS = [
  "Australian citizen",
  "Permanent resident",
  "New Zealand citizen",
  "Temporary visa with full work rights",
  "Temporary visa with limited work rights",
  "Requires sponsorship",
] as const;

export const contactSchema = z.object({
  id: z.literal("kb-contact"),
  name: req,
  email: req,
  phone: opt,
  location: req,
  linkedin: opt,
  github: opt,
});

export const workRightsSchema = z.object({ id: z.literal("kb-rights"), status: z.enum(WORK_RIGHTS), noticePeriod: opt, notes: opt });

/** skills: tags for matching; evidenceFor: the job requirement it was added for (SPEC §14.3). */
export const highlightSchema = z.object({ id: req, text: req, metric: opt, skills: z.array(z.string()).default([]), evidenceFor: opt });
const highlights = z.array(highlightSchema);

/** start and end are free text: "Mar 2022", "Present". */
export const roleSchema = z.object({ id: req, title: req, company: req, location: opt, start: req, end: req, highlights });
export const volunteerRoleSchema = z.object({ id: req, title: req, company: req, location: opt, start: opt, end: opt, highlights });
export const portfolioItemSchema = z.object({ id: req, name: req, summary: req, link: opt, highlights });
export const educationSchema = z.object({ id: req, degree: req, institution: req, year: opt, notes: opt });
export const skillGroupSchema = z.object({ id: req, group: req, items: z.array(req) });
export const credentialSchema = z.object({
  id: req,
  kind: z.enum(["Certification", "Award", "Publication", "Patent"]),
  title: req,
  issuer: opt,
  year: opt,
});
export const refereeSchema = z.object({ id: req, name: req, title: opt, company: opt, contact: req });
/** referenceOnly: original resume text kept for reference, never picked automatically. */
export const additionalSectionSchema = z.object({ id: req, title: req, notes: z.string(), referenceOnly: z.boolean().optional() });

/** The KB fields without the cross-entry checks (for partial drafts). */
export const kbObjectSchema = z.object({
  schemaVersion: z.literal(1),
  contact: contactSchema,
  workRights: workRightsSchema,
  roles: z.array(roleSchema),
  volunteering: z.array(volunteerRoleSchema).default([]), // older knowledge bases have none
  portfolio: z.array(portfolioItemSchema),
  education: z.array(educationSchema),
  skills: z.array(skillGroupSchema),
  credentials: z.array(credentialSchema),
  referees: z.array(refereeSchema),
  additional: z.array(additionalSectionSchema).default([]),
});

const LIST_KEYS = ["roles", "volunteering", "portfolio", "education", "skills", "credentials", "referees", "additional"] as const;

/** Entry and highlight IDs are unique across the whole KB: bullets reference highlights by ID. */
export const kbSchema = kbObjectSchema.superRefine((kb, ctx) => {
  const seen = new Set<string>([kb.contact.id, kb.workRights.id]);
  const claim = (id: string, path: (string | number)[]) => {
    if (seen.has(id)) ctx.addIssue({ code: "custom", message: `The ID "${id}" is already used`, path });
    seen.add(id);
  };
  for (const key of LIST_KEYS) {
    kb[key].forEach((entry, i) => {
      claim(entry.id, [key, i, "id"]);
      if ("highlights" in entry) entry.highlights.forEach((h, j) => claim(h.id, [key, i, "highlights", j, "id"]));
    });
  }
});

export type KnowledgeBase = z.infer<typeof kbSchema>;
export type Highlight = z.infer<typeof highlightSchema>;
export type Role = z.infer<typeof roleSchema>;
