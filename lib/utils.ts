export { cn } from "cn"

/** A stable ID with a short random suffix (SPEC §6.1): "role-1a2b3c4d". Never reuse or change one. */
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
