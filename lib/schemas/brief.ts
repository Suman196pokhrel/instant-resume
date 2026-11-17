import { z } from "zod";
import { req } from "./kb";

// Job brief (SPEC §6.2). The 3–8 requirements and 8–15 keywords are guidance for the LLM prompt, not limits:
// the user can edit the brief by hand.
export const briefSchema = z.object({
  title: req,
  company: req,
  location: z.string(),
  team: z.string().optional(),
  seniority: z.enum(["Junior", "Mid-level", "Senior", "Lead"]),
  requirements: z.array(req),
  niceToHave: z.array(req),
  keywords: z.array(req),
  workRights: z.string().default("Not stated"),
});

export type JobBrief = z.infer<typeof briefSchema>;
