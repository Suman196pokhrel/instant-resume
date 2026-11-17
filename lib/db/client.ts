import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

/** Opens the SQLite database (SPEC §3: ./data/instant-resume.db, creating ./data), or another libSQL URL in tests. */
// IR_DB_URL points the e2e server (and its db:seed) at a throwaway database, so tests never touch ./data.
export function openDb(url = process.env.IR_DB_URL) {
  if (!url) {
    const dir = join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    url = `file:${join(dir, "instant-resume.db")}`;
  }
  return drizzle(createClient({ url }), { schema });
}

export type Db = ReturnType<typeof openDb>;

// Captured when this module loads: Next.js runs from the project root (import.meta.url would point into its bundle).
const MIGRATIONS_DIR = join(process.cwd(), "lib/db/migrations");
const shared = globalThis as { __irDb?: Promise<Db> }; // survives dev hot reloads

/** The app's database: opened once per process, with migrations applied on first use (no db:migrate needed). */
export function getDb(): Promise<Db> {
  shared.__irDb ??= (async () => {
    const db = openDb();
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    return db;
  })().catch((e) => {
    shared.__irDb = undefined;
    throw e;
  });
  return shared.__irDb;
}
