import { z } from "zod";
import { req } from "./kb";
import { themeSchema } from "./theme";

// Documents (SPEC §6.3). Every bullet traces to a knowledge base highlight ID.
export const bulletSchema = z.object({ id: req, text: z.string(), source: req });

export const sectionItemSchema = z.object({
  id: req,
  ref: req, // KB entry ID
  heading: z.string(),
  sub: z.string().optional(),
  meta: z.string().optional(),
  line: z.string().optional(),
  bullets: z.array(bulletSchema).optional(),
});

export const TEXT_KINDS = ["summary", "paragraph"] as const;
export const ITEM_KINDS = ["experience", "skills", "portfolio", "education", "credentials", "referees", "additional"] as const;

const sectionBase = { id: req, title: z.string(), hidden: z.boolean() };
/** summary and paragraph sections use text; the other kinds use items. */
export const sectionSchema = z.union([
  z.object({ ...sectionBase, kind: z.enum(TEXT_KINDS), text: z.string() }),
  z.object({ ...sectionBase, kind: z.enum(ITEM_KINDS), items: z.array(sectionItemSchema) }),
]);

export const documentSchema = z.object({
  id: req,
  projectId: req,
  kind: z.enum(["resume", "coverLetter"]),
  theme: themeSchema,
  sections: z.array(sectionSchema),
  recipient: z.object({ name: z.string(), company: z.string(), location: z.string() }).optional(), // cover letter only
});

export type Bullet = z.infer<typeof bulletSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type ResumeDocument = z.infer<typeof documentSchema>;
