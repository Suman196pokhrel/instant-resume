"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileText, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/time";
import { toast } from "@/lib/toast";

// Applications dashboard (SPEC §13.1, mock Views.dashboard). Delete hides the card at once; the server delete goes
// out when its Undo toast closes, or straight away when the page is left, so Undo never has to restore anything.

export type ProjectSummary = { id: string; company: string; role: string; location: string; updatedAt: string };

const HUES = [168, 212, 330, 28, 260, 120]; // the mock's monogram hues
const newestFirst = (a: ProjectSummary, b: ProjectSummary) => b.updatedAt.localeCompare(a.updatedAt);
const sendDelete = (id: string) => fetch(`/api/projects/${id}`, { method: "DELETE", keepalive: true }).catch(() => {});

export function Dashboard({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [list, setList] = useState(projects);
  const [query, setQuery] = useState("");
  const pending = useRef(new Set<string>());

  useEffect(() => {
    const flush = () => {
      pending.current.forEach((id) => void sendDelete(id));
      pending.current.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  function remove(p: ProjectSummary) {
    pending.current.add(p.id);
    setList((l) => l.filter((x) => x.id !== p.id));
    toast("Application deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          if (!pending.current.delete(p.id)) return; // already sent
          setList((l) => [...l, p].sort(newestFirst));
        },
      },
      onClose: () => pending.current.delete(p.id) && void sendDelete(p.id),
    });
  }

  async function duplicate(p: ProjectSummary) {
    const res = await fetch(`/api/projects/${p.id}/duplicate`, { method: "POST" });
    if (!res.ok) return toast("Couldn't duplicate the application. Try again.", { kind: "error" });
    const { project } = await res.json();
    setList((l) => [project, ...l]);
  }

  const q = query.trim().toLowerCase();
  const shown = list.filter((p) => `${p.company} ${p.role}`.toLowerCase().includes(q));

  return (
    <>
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Applications</h1>
          <p className="mt-1.5 text-muted-foreground">One job description, a tailored resume and a cover letter. Everything saves automatically.</p>
        </div>
        <div className="relative w-[260px] max-[900px]:w-full">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Search applications" placeholder="Search company or role" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
        </div>
      </div>
      {!list.length ? (
        <EmptyState
          icon={<FileText className="size-6" />}
          title="No applications yet"
          action={
            <Link href="/new" className={buttonVariants()}>
              <Plus /> New application
            </Link>
          }
        >
          An application holds the job description, your tailored resume and your cover letter for one job.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
            {shown.map((p) => (
              <article
                key={p.id}
                className="relative flex min-h-[172px] flex-col gap-0.5 rounded-lg border border-line bg-surface p-4 transition-[border-color,box-shadow,translate] duration-(--t) ease-(--ease) hover:-translate-y-px hover:border-line-2 hover:shadow-card-hover has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-primary"
              >
                <div className="mb-2.5 flex items-start justify-between">
                  <span aria-hidden className="grid size-[34px] place-items-center rounded-[9px] text-[15px] font-bold monogram" style={{ "--h": HUES[p.company.charCodeAt(0) % HUES.length] } as React.CSSProperties}>
                    {p.company.charAt(0)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button size="icon" aria-label={`More for ${p.company}`} className="relative z-10 -mt-1 -mr-1.5" />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/projects/${p.id}`)}>
                        <FileText /> Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicate(p)}>
                        <Copy /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => remove(p)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link href={`/projects/${p.id}`} className="text-[15.5px] font-semibold tracking-[-0.01em] text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']">
                  {p.role}
                </Link>
                <div className="font-medium text-ink-2">{p.company}</div>
                <div className="text-[13px] text-muted-foreground">{p.location}</div>
                <div className="mt-auto pt-3.5 text-[13px] text-muted-foreground" suppressHydrationWarning>
                  Edited {timeAgo(p.updatedAt)}
                </div>
              </article>
            ))}
            <Link
              href="/new"
              className="flex min-h-[172px] items-center justify-center gap-2 rounded-lg border border-dashed border-line-2 font-medium text-muted-foreground no-underline transition-colors duration-(--t) ease-(--ease) hover:border-primary hover:bg-surface hover:text-accent-ink"
            >
              <Plus className="size-4" /> New application
            </Link>
          </div>
          {!shown.length && <p className="mt-3.5 text-muted-foreground">No matching applications.</p>}
        </>
      )}
    </>
  );
}
