// Re-import check (TASK-54, SPEC §14.1): merging a second version of the same resume would add every job again, so
// Review names the draft entries that look like saved ones and lets the user decide. A guess, never a silent skip.

type Entry = Record<string, unknown>;
type Lists = Partial<Record<"roles" | "volunteering" | "portfolio" | "education", Entry[]>>;
export type Duplicate = { key: keyof Lists; index: number };

const FILLER = new Set(["with", "and", "the", "pty", "ltd", "inc", "for", "corp", "llc"]);
const words = (v: unknown) => new Set((typeof v === "string" ? v.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [] : []).filter((w) => !FILLER.has(w)));

/** Shared words over the shorter side: "Technical Lead" and "Technical Lead and Full-Stack Developer" are 1. */
function overlap(a: unknown, b: unknown) {
  const [x, y] = [words(a), words(b)];
  if (!x.size || !y.size) return 0;
  return [...x].filter((w) => y.has(w)).length / Math.min(x.size, y.size);
}

const SAME: Record<keyof Lists, (a: Entry, b: Entry) => boolean> = {
  roles: (a, b) => overlap(a.company, b.company) >= 0.6 && overlap(a.title, b.title) >= 0.6,
  volunteering: (a, b) => overlap(a.company, b.company) >= 0.6 && overlap(a.title, b.title) >= 0.6,
  portfolio: (a, b) => overlap(a.name, b.name) >= 0.8,
  education: (a, b) => overlap(a.institution, b.institution) >= 0.6 && overlap(a.degree, b.degree) >= 0.5,
};

/** Draft entries that look like ones already in the knowledge base. */
export function duplicates(draft: Lists, kb: Lists | null): Duplicate[] {
  if (!kb) return [];
  return (Object.keys(SAME) as (keyof Lists)[]).flatMap((key) =>
    (draft[key] ?? []).flatMap((e, index) => ((kb[key] ?? []).some((saved) => SAME[key](e, saved)) ? [{ key, index }] : []))
  );
}
