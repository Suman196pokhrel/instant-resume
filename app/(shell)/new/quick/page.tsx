import { redirect } from "next/navigation";
import { QuickGenerate } from "@/components/quick/QuickGenerate";
import { RenderWarmup } from "@/components/render/RenderWarmup";
import { Content, Crumbs, TopBar } from "@/components/shell/TopBar";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";
import { readPrefs } from "@/lib/db/settings";

// Quick generate (SPEC §14.3): paste a job description, then five stages to finished documents.
export default async function Page() {
  const db = await getDb();
  const kb = await readKb(db);
  if (!kb) redirect("/onboarding"); // nothing to draw on yet
  return (
    <>
      <RenderWarmup />
      <TopBar title={<Crumbs trail={[{ label: "Applications", href: "/dashboard" }, { label: "New application", href: "/new" }, { label: "Quick generate" }]} />} />
      <Content>
        <QuickGenerate kb={kb} prefs={await readPrefs(db)} />
      </Content>
    </>
  );
}
