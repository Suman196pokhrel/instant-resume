import { redirect } from "next/navigation";
import { Content, Crumbs, TopBar } from "@/components/shell/TopBar";
import { StudioSetup } from "@/components/studio/StudioSetup";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";
import { readPrefs } from "@/lib/db/settings";
import { sampleJds } from "@/lib/dev-samples";

// Studio (SPEC §14.4): job description, job brief, choose entries, generate.
export default async function Page() {
  const db = await getDb();
  const kb = await readKb(db);
  if (!kb) redirect("/onboarding"); // nothing to draw on yet
  return (
    <>
      <TopBar title={<Crumbs trail={[{ label: "Applications", href: "/dashboard" }, { label: "New application", href: "/new" }, { label: "Studio" }]} />} />
      <Content>
        <StudioSetup kb={kb} prefs={await readPrefs(db)} samples={await sampleJds()} />
      </Content>
    </>
  );
}
