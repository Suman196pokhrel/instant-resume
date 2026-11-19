import Link from "next/link";
import { Fragment } from "react";
import { ChevronLeft } from "lucide-react";
import { ModelPicker } from "./ModelPicker";

/** Top bar (SPEC §11.4): title on the left; actions and the model picker on the right. */
export function TopBar({ title, actions }: { title?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-[var(--topbar-h)] items-center justify-between gap-3 border-b border-line bg-background px-7 max-[900px]:px-4">
      <div className="flex min-w-0 items-center gap-2 font-medium">{title}</div>
      <div className="flex items-center gap-2">
        {actions}
        <ModelPicker />
      </div>
    </header>
  );
}

/** Page content column (SPEC §11.4): max-width 1180px, 28px padding (16px on phones). */
export function Content({ children }: { children: React.ReactNode }) {
  return <main className="w-full max-w-[1180px] p-7 max-[900px]:px-4 max-[900px]:py-5">{children}</main>;
}

/** Top bar breadcrumbs (SPEC §13, mock .crumb): "‹ Applications / New application / …"; the last one is the page itself. */
export function Crumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
      {trail.map((c, i) => (
        <Fragment key={c.label}>
          {i > 0 && <span className="text-line-2">/</span>}
          {c.href ? (
            <Link href={c.href} className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-ink-2 no-underline hover:text-ink">
              {i === 0 && <ChevronLeft className="size-[15px]" />}
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="truncate">
              {c.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
