import Link from "next/link";
import { Plus } from "lucide-react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Content, TopBar } from "@/components/shell/TopBar";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db/client";
import { listProjects } from "@/lib/db/projects";

// Applications (SPEC §13.1). The setup checklist arrives with TASK-29.
export default async function Page() {
  const projects = await listProjects(await getDb());
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
        <Dashboard projects={projects} />
      </Content>
    </>
  );
}
