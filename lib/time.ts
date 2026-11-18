// SPEC §13.1 time-ago format (ported from mock core.js timeAgo): "just now", "5 minutes ago", "2 weeks ago".
const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.round((now - Date.parse(iso)) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return plural(m, "minute");
  const h = Math.round(m / 60);
  if (h < 24) return plural(h, "hour");
  const d = Math.round(h / 24);
  return d < 14 ? plural(d, "day") : plural(Math.round(d / 7), "week");
}
