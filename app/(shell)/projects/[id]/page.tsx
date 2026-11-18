import { notFound, redirect } from "next/navigation";
import { RenderWarmup } from "@/components/render/RenderWarmup";
import { Workspace } from "@/components/workspace/Workspace";
import { ApiError } from "@/lib/api";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";
import { readProject } from "@/lib/db/projects";
import { readPrefs } from "@/lib/db/settings";

// The Workspace (SPEC §14.5): its own 54px bar instead of the top bar (§11.4).
export default async function Page({ params }: PageProps<"/projects/[id]">) {
  const db = await getDb();
  const bundle = await readProject(db, (await params).id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const kb = await readKb(db);
  if (!kb) redirect("/onboarding");
  return (
    <>
      <RenderWarmup />
      <Workspace key={bundle.project.id} bundle={bundle} kb={kb} prefs={await readPrefs(db)} /> {/* a new store per project */}
    </>
  );
}
