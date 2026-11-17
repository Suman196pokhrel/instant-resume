import { z } from "zod";
import { kbObjectSchema } from "./kb";

// Settings (SPEC §6.5): stored in the DB settings table, except connections and the active model (browser only).
export const prefsSchema = z.object({
  paper: z.enum(["A4", "Letter"]).default("A4"),
  spelling: z.enum(["en-AU", "en-US"]).default("en-AU"),
  quick: z
    .object({
      theme: z.enum(["classic", "modern", "compact"]).default("classic"),
      pages: z.union([z.literal(1), z.literal(2)]).default(2),
      coverLetter: z.boolean().default(true),
      tone: z.enum(["Professional", "Warm", "Concise"]).default("Professional"),
    })
    .prefault({}),
  dismissedOnboardingBanner: z.boolean().default(false),
});

export const onboardingStateSchema = z.object({
  step: z.number().int().min(0),
  maxStep: z.number().int().min(0),
  draft: kbObjectSchema.partial(),
  completed: z.boolean(),
  imported: z.string().optional(),
  saveMode: z.enum(["merge", "replace"]).default("merge"),
});

export const activeModelSchema = z.object({ provider: z.enum(["anthropic", "openai", "gemini"]), model: z.string().min(1) });

export type Prefs = z.infer<typeof prefsSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export type ActiveModel = z.infer<typeof activeModelSchema>;
