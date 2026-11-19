import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Upload } from "lucide-react";
import { BackupButtons } from "@/components/backup/BackupButtons";
import { KbScreen } from "@/components/kb/KbScreen";
import { Content, TopBar } from "@/components/shell/TopBar";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";
import { isKbSection } from "@/lib/schemas/kb-fields";

// SPEC §13.2: Import resume, then the backup buttons (a restore, not a resume import).
export default async function Page({ params }: PageProps<"/kb/[section]">) {
  const { section } = await params;
  if (!isKbSection(section)) notFound();
  const kb = await readKb(await getDb());
  if (!kb) redirect("/onboarding"); // no knowledge base yet: build one first
  return (
    <>
      <TopBar
        actions={
          <>
            <Link href="/import" className={buttonVariants()}>
              <Upload /> Import resume
            </Link>
            <span className="contents max-[900px]:hidden">
              <BackupButtons order="import-first" /> {/* phones: too wide for the top bar; Settings → Your data has them */}
            </span>
          </>
        }
      />
      <Content>
        <KbScreen kb={kb} section={section} />
      </Content>
    </>
  );
}
