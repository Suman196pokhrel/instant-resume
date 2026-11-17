import { z } from "zod";
import { briefSchema } from "./brief";
import { documentSchema } from "./document";
import { req } from "./kb";

// Project and revisions (SPEC §6.4).
export const projectSchema = z.object({
  id: req,
  schemaVersion: z.literal(1),
  company: req,
  role: req,
  location: z.string(),
  jdText: z.string(),
  brief: briefSchema,
  selected: z.array(z.string()), // KB entry IDs
  source: z.enum(["studio", "quick"]),
  coverLetterOff: z.boolean().optional(),
  gaps: z.array(z.string()).optional(),
  notes: z.string().optional(), // the user's notes for this application
  createdAt: req,
  updatedAt: req,
});

export const revisionSchema = z.object({
  id: req,
  documentId: req,
  ts: req,
  kind: z.enum(["generation", "rewrite", "edit", "adjustment", "structure", "restore"]),
  label: req,
  coalesceKey: z.string().optional(), // edit-{sectionId}, title-{sectionId}, design
  snapshot: documentSchema,
});

export type Project = z.infer<typeof projectSchema>;
export type Revision = z.infer<typeof revisionSchema>;
