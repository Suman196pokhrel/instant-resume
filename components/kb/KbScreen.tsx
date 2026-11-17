import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip, Count, Pill } from "@/components/ui/pill";
import { entrySummary, KB_ORDER, KB_SECTIONS, type KbSection } from "@/lib/schemas/kb-fields";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { EntryDialog } from "./EntryDialog";
import type { Entry as KbEntry } from "./EntryForm";

type Entry = KbEntry & { id: string };

const card = "rounded-lg border border-line bg-surface px-[18px] py-4";
const kbId = "font-mono text-[11.5px] text-muted-foreground";

const editButton = (name: string) => (
  <Button variant="ghost" size="sm" aria-label={`Edit ${name}`}>
    <Pencil className="size-3.5" /> Edit
  </Button>
);

/** Knowledge base screen (SPEC §13.2, mock Views.kb): section nav with counts, entry cards, add and edit dialogs. */
export function KbScreen({ kb, section }: { kb: KnowledgeBase; section: KbSection }) {
  const def = KB_SECTIONS[section];
  const list = def.single ? [] : (kb[section] as Entry[]);

  return (
    <>
      <div className="mb-[22px]">
        <h1>Knowledge base</h1>
        <p className="mt-1.5 text-muted-foreground">Every fact here is entered once. Resumes and cover letters can only use what&apos;s stored here.</p>
      </div>
      <div className="grid grid-cols-[210px_1fr] items-start gap-6 max-[900px]:grid-cols-1">
        <nav aria-label="Knowledge base sections" className="sticky top-20 flex flex-col gap-0.5 max-[900px]:static max-[900px]:flex-row max-[900px]:overflow-x-auto max-[900px]:pb-1">
          {KB_ORDER.map((t) => (
            <Link
              key={t}
              href={`/kb/${t}`}
              aria-current={t === section ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-1.5 rounded-sm px-2.5 py-[7px] font-medium whitespace-nowrap text-ink-2 no-underline hover:bg-sunken hover:text-ink",
                t === section && "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-surface"
              )}
            >
              {KB_SECTIONS[t].label}
              {!KB_SECTIONS[t].single && <Count>{(kb[t] as unknown[]).length}</Count>}
            </Link>
          ))}
        </nav>
        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2>{def.label}</h2>
            {!def.single && (
              <EntryDialog
                section={section}
                trigger={
                  <Button variant="ghost" size="sm" data-kb-add>
                    <Plus className="size-3.5" /> Add {def.noun}
                  </Button>
                }
              />
            )}
          </div>
          {/* Work rights may be unset (SPEC §14.1), so it falls back to an empty card. */}
          {def.single ? (
            <SingleCard section={section} entry={(kb[section as "contact" | "workRights"] ?? { id: "kb-rights" }) as Entry} />
          ) : list.length ? (
            list.map((e) => <EntryCard key={e.id} section={section} entry={e} />)
          ) : (
            <EmptyState size="sm" title={`No ${def.label.toLowerCase()} yet`}>
              Add one and it becomes available to every application.
            </EmptyState>
          )}
        </section>
      </div>
    </>
  );
}

function SingleCard({ section, entry }: { section: KbSection; entry: Entry }) {
  const def = KB_SECTIONS[section];
  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3>{def.label}</h3>
          <div className={kbId}>{entry.id}</div>
        </div>
        <EntryDialog section={section} entry={entry} trigger={editButton(def.label.toLowerCase())} />
      </div>
      <dl className="mt-3.5 grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 max-[900px]:grid-cols-1">
        {def.fields.map((f) => (
          <div key={f.k} className="contents">
            <dt className="text-muted-foreground">{f.label}</dt>
            <dd>{(entry[f.k] as string) || <span className="text-muted-foreground">Not set</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EntryCard({ section, entry }: { section: KbSection; entry: Entry }) {
  const s = entrySummary(section, entry);
  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3>{s.title}</h3>
          {s.sub && <div className="font-medium text-ink-2">{s.sub}</div>}
          {s.meta && <div className="text-[13px] text-muted-foreground">{s.meta}</div>}
        </div>
        <div className="flex items-center gap-2.5">
          <span className={kbId}>{entry.id}</span>
          <EntryDialog section={section} entry={entry} trigger={editButton(s.title)} />
        </div>
      </div>
      {s.line && <p className="mt-2.5 text-ink-2">{s.line}</p>}
      {s.chips && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.chips.map((c, i) => (
            <Chip key={i}>{c}</Chip>
          ))}
        </div>
      )}
      {!!entry.highlights?.length && (
        <ul className="mt-3.5 border-t border-line">
          {entry.highlights.map((h) => (
            <li key={h.id} className="flex justify-between gap-4 border-b border-line py-[9px] last:border-b-0 last:pb-0">
              <span>{h.text}</span>
              {h.metric && <Pill variant="metric">{h.metric}</Pill>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
