export { cn } from "cn"

/** A stable ID with a short random suffix (SPEC §6.1): "role-1a2b3c4d". Never reuse or change one. */
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;

/** "AVAILABILITY" → "Availability": headings copied from a resume in capitals read as shouting on the page. */
export const tidyHeading = (t: string) => (/[A-Z]/.test(t) && t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t);
