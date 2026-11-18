import { redirect } from "next/navigation";
import { Content, TopBar } from "@/components/shell/TopBar";
import { StudioSetup } from "@/components/studio/StudioSetup";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";

// Studio setup (SPEC §14.4): job description, job brief, choose entries. Generation is TASK-13.
export default async function Page() {
  const kb = await readKb(await getDb());
  if (!kb) redirect("/onboarding"); // nothing to draw on yet
  return (
    <>
      <TopBar title="New application / Studio" />
      <Content>
        <StudioSetup kb={kb} />
      </Content>
    </>
  );
}
