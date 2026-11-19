import Link from "next/link";
import { Layers, Zap } from "lucide-react";
import { Content, Crumbs, TopBar } from "@/components/shell/TopBar";
import { buttonVariants } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { cn } from "cn";

const card = "flex flex-col gap-2 rounded-lg border border-line bg-surface p-[22px] text-ink no-underline hover:border-line-2";
const icon = "grid size-9 place-items-center rounded-md bg-sunken text-ink-2 [&>svg]:size-5";

/** New application chooser (SPEC §14.2, mock newProjectChooser). */
export default function Page() {
  return (
    <>
      <TopBar title={<Crumbs trail={[{ label: "Applications", href: "/dashboard" }, { label: "New application" }]} />} />
      <Content>
        <div className="mx-auto max-w-[900px]">
          <h1>New application</h1>
          <p className="mt-1 mb-6 text-muted-foreground">One application per job. How would you like to start?</p>
          <div className="grid grid-cols-[1.15fr_1fr] gap-3.5 max-[900px]:grid-cols-1">
            <Link href="/new/quick" className={cn(card, "border-accent-line shadow-[inset_0_0_0_1px_var(--accent-line)]")}>
              <span className="flex items-center justify-between">
                <span className={icon}>
                  <Zap />
                </span>
                <Pill variant="ok">Recommended</Pill>
              </span>
              <h2>Quick generate</h2>
              <p className="text-ink-2">Paste a job description and get a finished resume and cover letter in about 15 seconds. Anything missing is flagged, never blocking.</p>
              <span className={cn(buttonVariants(), "mt-auto self-start")}>Quick generate</span>
            </Link>
            <Link href="/new/studio" className={card}>
              <span className={icon}>
                <Layers />
              </span>
              <h2>Open in Studio</h2>
              <p className="text-ink-2">Review the job brief, choose which experience to use, then edit each section yourself before you export.</p>
              <span className={cn(buttonVariants({ variant: "ghost" }), "mt-auto self-start")}>Open in Studio</span>
            </Link>
          </div>
          <p className="mt-3.5 text-center text-[13px] text-muted-foreground">You can open anything made with Quick generate in Studio later.</p>
        </div>
      </Content>
    </>
  );
}
