"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, File, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", match: ["/dashboard", "/new", "/projects"], label: "Applications", Icon: File },
  { href: "/kb/roles", match: ["/kb", "/onboarding", "/import"], label: "Knowledge base", Icon: Book },
  { href: "/settings", match: ["/settings"], label: "Settings", Icon: Settings },
];

/** Sidebar + main column (SPEC §11.4, §13). Compact in the Workspace; a bottom bar at ≤900px. Mock: core.js shell(). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const compact = pathname.startsWith("/projects/");

  return (
    <div
      data-shell={compact ? "compact" : "full"}
      className={cn(
        "group/shell grid min-h-dvh grid-cols-[var(--side)_minmax(0,1fr)] max-[900px]:grid-cols-1",
        compact && "[--side:60px]",
      )}
    >
      <aside
        className={cn(
          "sticky top-0 flex h-dvh flex-col gap-[18px] border-r border-line bg-surface-2 px-3 py-4",
          "group-data-[shell=compact]/shell:items-center group-data-[shell=compact]/shell:px-2.5 group-data-[shell=compact]/shell:py-3",
          "max-[900px]:bottom-0 max-[900px]:top-auto max-[900px]:order-2 max-[900px]:z-40 max-[900px]:h-auto max-[900px]:flex-row max-[900px]:items-center max-[900px]:gap-2 max-[900px]:border-r-0 max-[900px]:border-t max-[900px]:px-3 max-[900px]:py-2",
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Instant Resume home"
          className="flex items-center gap-[9px] px-2 py-1 text-ink no-underline group-data-[shell=compact]/shell:px-0"
        >
          <span aria-hidden className="grid size-[30px] flex-none place-items-center rounded-md bg-ink text-background">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
              <path d="M6 3h9l4 4v14H6z" />
              <path d="M9 11h7M9 15h4" />
              <path d="M15 3v4h4" />
            </svg>
          </span>
          <span className="text-[15px] font-[650] tracking-[-0.01em] group-data-[shell=compact]/shell:hidden max-[900px]:hidden">
            Instant Resume
          </span>
        </Link>

        <nav aria-label="Main" className="flex flex-col gap-0.5 max-[900px]:flex-1 max-[900px]:flex-row max-[900px]:justify-around">
          {NAV.map(({ href, match, label, Icon }) => {
            const active = match.some((m) => pathname === m || pathname.startsWith(m + "/"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/nav flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-medium text-ink-2 no-underline transition-[background-color,color,box-shadow] duration-(--t)",
                  "hover:bg-sunken hover:text-ink",
                  "aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_0_0_0_1px_var(--line)]",
                  "group-data-[shell=compact]/shell:justify-center group-data-[shell=compact]/shell:p-[9px]",
                  "max-[900px]:w-auto max-[900px]:justify-center",
                )}
              >
                <Icon size={18} aria-hidden className="flex-none group-aria-[current=page]/nav:text-primary" />
                <span className="group-data-[shell=compact]/shell:sr-only max-[900px]:sr-only">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 max-[900px]:hidden">
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground group-data-[shell=compact]/shell:justify-center group-data-[shell=compact]/shell:px-0">
            <span aria-hidden className="size-[7px] flex-none rounded-full bg-primary" />
            <span className="group-data-[shell=compact]/shell:sr-only">Stored on this device</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col max-[900px]:order-1 max-[900px]:min-h-[calc(100dvh-56px)]">{children}</div>
    </div>
  );
}
