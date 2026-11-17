import { z } from "zod";
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
} from "./kb";

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

/** The wizard's last step index (11 steps, SPEC §14.1). */
export const ONBOARDING_LAST_STEP = 10;
const stepIndex = z.number().int().min(0).transform((n) => Math.min(n, ONBOARDING_LAST_STEP));

/**
 * A wizard draft. Everything may be incomplete: an import keeps what it found and leaves missing facts blank for
 * Review (SPEC §14.1). Completing it validates the whole knowledge base, so nothing incomplete is saved.
 */
const draftList = <T extends z.ZodObject>(entry: T) => z.array(entry.partial()).optional();
export const onboardingDraftSchema = z.object({
  contact: contactSchema.partial().optional(),
  workRights: workRightsSchema.partial().optional(),
  roles: draftList(roleSchema),
  volunteering: draftList(volunteerRoleSchema),
  portfolio: draftList(portfolioItemSchema),
  education: draftList(educationSchema),
  skills: draftList(skillGroupSchema),
  credentials: draftList(credentialSchema),
  referees: draftList(refereeSchema),
  additional: draftList(additionalSectionSchema),
});

export const onboardingStateSchema = z.object({
  step: stepIndex,
  maxStep: stepIndex,
  draft: onboardingDraftSchema,
  completed: z.boolean(),
  imported: z.string().optional(),
  saveMode: z.enum(["merge", "replace"]).default("merge"),
});

export const activeModelSchema = z.object({ provider: z.enum(["anthropic", "openai", "gemini"]), model: z.string().min(1) });

export type Prefs = z.infer<typeof prefsSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
export type ActiveModel = z.infer<typeof activeModelSchema>;
