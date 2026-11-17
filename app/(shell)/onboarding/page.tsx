import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Upload } from "lucide-react";
import { Content, TopBar } from "@/components/shell/TopBar";
import { buttonVariants } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { getDb } from "@/lib/db/client";
import { isUnfinished, readOnboarding } from "@/lib/db/onboarding";

const choice = "flex flex-col gap-2 rounded-lg border border-line bg-surface p-[22px] text-ink no-underline transition-[border-color,box-shadow] duration-(--t) hover:border-line-2 hover:shadow-card-hover";
const icon = "grid size-10 place-items-center rounded-[10px] border border-line bg-surface-2 text-ink-2";

// Onboarding chooser (SPEC §13, §14.1a): import (recommended) or manual. An unfinished wizard resumes instead.
export default async function Page() {
  if (isUnfinished(await readOnboarding(await getDb()))) redirect("/onboarding/manual");
  return (
    <>
      <TopBar title="Set up your background" />
      <Content>
        <div className="mx-auto max-w-[900px]">
          <div className="mb-[22px]">
            <h1>Build your knowledge base</h1>
            <p className="mt-1.5 text-muted-foreground">Start from your existing resume or enter your background yourself.</p>
          </div>
          <div className="grid grid-cols-[1.15fr_1fr] gap-3.5 max-[900px]:grid-cols-1">
            <Link href="/import" className={`${choice} border-accent-line shadow-[inset_0_0_0_1px_var(--accent-line)] hover:border-primary`}>
              <span className="mb-1 flex items-center justify-between">
                <span className={`${icon} border-accent-line bg-accent-soft text-accent-ink`}>
                  <Upload className="size-6" />
                </span>
                <Pill variant="ok">Recommended · about 2 minutes</Pill>
              </span>
              <h2>Import an existing resume</h2>
              <p className="flex-1 text-ink-2">
                Bring in your contact details, experience, volunteer work, education and other sections. Review everything before saving. A LinkedIn profile saved as a PDF works
                too.
              </p>
              <span className={`${buttonVariants()} pointer-events-none self-start`}>Upload resume</span>
            </Link>
            <Link href="/onboarding/manual" className={choice}>
              <span className={icon}>
                <Pencil className="size-6" />
              </span>
              <h2>Enter details manually</h2>
              <p className="flex-1 text-ink-2">Work through the guided fields at your own pace. Optional sections can be skipped.</p>
              <span className={`${buttonVariants({ variant: "ghost" })} pointer-events-none self-start`}>Start manually</span>
            </Link>
          </div>
          <p className="mt-3.5 text-[13px] text-muted-foreground">Source-available and self-hosted, with your own AI provider key.</p>
        </div>
      </Content>
    </>
  );
}
