import { BackupButtons } from "@/components/backup/BackupButtons";
import { AccessSettings } from "@/components/settings/Access";
import { Connections } from "@/components/settings/Connections";
import { CorePrompts } from "@/components/settings/Instructions";
import { PrefsSettings } from "@/components/settings/Prefs";
import { WipeKb } from "@/components/settings/WipeKb";
import { Content, TopBar } from "@/components/shell/TopBar";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";
import { readPrefs } from "@/lib/db/settings";
import { SYSTEM as BRIEF } from "@/lib/brief/extract";
import { SYSTEM as WRITE } from "@/lib/generate/generate";
import { SYSTEM as REWRITE } from "@/lib/generate/rewrite";
import { SYSTEM as IMPORT } from "@/lib/import/extract";
import { SYSTEM as MATCH } from "@/lib/match/evidence";
import { SYSTEM as MISSING } from "@/lib/generate/missing";

// Read-only, in the order a resume is made. The adapter also adds the output format; that isn't shown.
const PROMPTS = [
  { name: "Import", use: "sorts an uploaded resume into your knowledge base", text: IMPORT },
  { name: "Job brief", use: "reads the job description", text: BRIEF },
  { name: "Matching", use: "links each must-have to your experience", text: MATCH },
  { name: "Writing", use: "writes the resume and cover letter", text: WRITE },
  { name: "Rewrite", use: "rewrites one section in Studio", text: REWRITE },
  { name: "Add what's missing", use: "turns what you say into knowledge base bullets", text: MISSING },
];

// Settings (SPEC §13.3).
export default async function Page() {
  const db = await getDb();
  const [prefs, kb] = await Promise.all([readPrefs(db), readKb(db)]);
  const hasKb = !!kb;
  return (
    <>
      <TopBar title="Settings" />
      <Content>
        <div className="mb-[22px]">
          <h1>Settings</h1>
          <p className="mt-1.5 text-muted-foreground">Connections, preferences and your data.</p>
        </div>
        <Connections />
        <PrefsSettings key={JSON.stringify(prefs)} initial={prefs} /> {/* a backup import brings new prefs: start from them */}
        <CorePrompts prompts={PROMPTS} />
        <section className="mb-[34px]">
          <h2 className="mb-1">Your data</h2>
          <p className="mb-3.5 text-muted-foreground">Everything lives in a database file on this machine. Export a backup regularly; API keys are left out.</p>
          <div className="flex flex-wrap items-center gap-2">
            <BackupButtons />
            {hasKb && <WipeKb />}
          </div>
        </section>
        <AccessSettings passwordMode={!!process.env.APP_PASSWORD} />
      </Content>
    </>
  );
}
