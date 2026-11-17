// Where to go after unlocking: only a path on this site, never another origin (open redirect).
export function safeNext(next: string | null | undefined): string {
  const fallback = "/dashboard";
  if (!next?.startsWith("/")) return fallback;
  try {
    const url = new URL(next, "http://same.invalid");
    return url.origin === "http://same.invalid" ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}
