import { Wizard } from "@/components/onboarding/Wizard";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";
import { readOnboarding } from "@/lib/db/onboarding";
import { devUiEnabled } from "@/lib/dev";
import { KB_ORDER } from "@/lib/schemas/kb-fields";

// Full-screen manual onboarding wizard (SPEC §14.1), resuming at the saved step.
export default async function Page() {
  const db = await getDb();
  const [state, kb] = await Promise.all([readOnboarding(db), readKb(db)]);
  // Dev only: "Fill with sample" (SPEC §17). Loaded here so the sample never ships in the production bundle.
  const sample = devUiEnabled() ? (await import("@/tests/fixtures/kb.json")).default : null;
  const existing = kb && { roles: kb.roles, volunteering: kb.volunteering, portfolio: kb.portfolio, education: kb.education }; // for the re-import check (TASK-54)
  return <Wizard initial={state} kbExists={!!kb} existing={existing} sample={sample && Object.fromEntries(KB_ORDER.map((k) => [k, (sample as Record<string, unknown>)[k] ?? []]))} />;
}
