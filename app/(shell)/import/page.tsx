import { ImportForm } from "@/components/import/ImportForm";
import { Content, TopBar } from "@/components/shell/TopBar";
import { getDb } from "@/lib/db/client";
import { isUnfinished, readOnboarding } from "@/lib/db/onboarding";

// Resume import (SPEC §14.1a). An unfinished onboarding draft is replaced only after the user confirms.
export default async function Page() {
  const unfinished = isUnfinished(await readOnboarding(await getDb()));
  return (
    <>
      <TopBar title="Import resume" />
      <Content>
        <div className="mx-auto max-w-[900px]">
          <div className="mb-[22px]">
            <h1>Import your resume</h1>
            <p className="mt-1.5 text-muted-foreground">Bring your background into the knowledge base, then review it before saving.</p>
          </div>
          <ImportForm unfinished={unfinished} />
        </div>
      </Content>
    </>
  );
}
