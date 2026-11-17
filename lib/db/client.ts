import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/** Opens the SQLite database (SPEC §3: ./data/instant-resume.db, creating ./data), or another libSQL URL in tests. */
export function openDb(url?: string) {
  if (!url) {
    const dir = join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    url = `file:${join(dir, "instant-resume.db")}`;
  }
  return drizzle(createClient({ url }), { schema });
}

export type Db = ReturnType<typeof openDb>;
