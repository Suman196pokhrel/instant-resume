/** The brand mark (SPEC §13): a dark rounded square with a document icon. */
export function BrandMark() {
  return (
    <span aria-hidden className="grid size-[30px] flex-none place-items-center rounded-md bg-ink text-background">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 11h7M9 15h4" />
        <path d="M15 3v4h4" />
      </svg>
    </span>
  );
}
