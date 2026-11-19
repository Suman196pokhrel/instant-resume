import { Lock } from "lucide-react";
import { UnlockForm } from "@/components/access/UnlockForm";
import { safeNext } from "@/lib/access/safe-next";

// Password mode only (SPEC §4.1, §13.3): the proxy sends every locked request here with ?next= to return to.
export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-6">
      <div className="flex w-full max-w-[400px] flex-col gap-3.5 rounded-lg border border-line bg-surface p-7 shadow-card">
        <span aria-hidden className="grid size-10 place-items-center rounded-md bg-ink text-background">
          <Lock size={20} />
        </span>
        <div>
          <h1 className="text-[22px]">Unlock Instant Resume</h1>
          <p className="mt-1.5 text-muted-foreground">Enter the password to continue.</p>
        </div>
        <UnlockForm next={safeNext(typeof next === "string" ? next : null)} />
      </div>
    </main>
  );
}
