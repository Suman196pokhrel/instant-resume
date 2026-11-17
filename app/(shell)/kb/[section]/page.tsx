import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Upload } from "lucide-react";
import { KbScreen } from "@/components/kb/KbScreen";
import { Content, TopBar } from "@/components/shell/TopBar";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";
import { isKbSection } from "@/lib/schemas/kb-fields";

// SPEC §13.2. Import backup and Export backup join the top bar with TASK-27.
export default async function Page({ params }: PageProps<"/kb/[section]">) {
  const { section } = await params;
  if (!isKbSection(section)) notFound();
  const kb = await readKb(await getDb());
  if (!kb) redirect("/onboarding"); // no knowledge base yet: build one first
  return (
    <>
      <TopBar
        actions={
          <Link href="/import" className={buttonVariants()}>
            <Upload /> Import resume
          </Link>
        }
      />
      <Content>
        <KbScreen kb={kb} section={section} />
      </Content>
    </>
  );
}
