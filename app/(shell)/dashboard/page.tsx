import Link from "next/link";
import { Plus } from "lucide-react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { RenderWarmup } from "@/components/render/RenderWarmup";
import { Content, TopBar } from "@/components/shell/TopBar";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";
import { listProjects } from "@/lib/db/projects";
import { readPrefs } from "@/lib/db/settings";

// Applications (SPEC §13.1), with the setup checklist on a first run.
export default async function Page() {
  const db = await getDb();
  const [projects, kb, prefs] = await Promise.all([listProjects(db), readKb(db), readPrefs(db)]);
  return (
    <>
      <TopBar
        actions={
          <Link href="/new" className={buttonVariants()}>
            <Plus /> New application
          </Link>
        }
      />
      <Content>
        <SetupChecklist hasKb={!!kb} hasProject={projects.length > 0} prefs={prefs} />
        <Dashboard projects={projects} />
        {projects.length > 0 && <RenderWarmup idle />}
      </Content>
    </>
  );
}
