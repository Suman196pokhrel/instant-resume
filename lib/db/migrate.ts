import { fileURLToPath, pathToFileURL } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import { openDb, type Db } from "./client";

/** Applies the committed SQL migrations (lib/db/migrations). Safe to run again. */
export async function migrateDb(db: Db = openDb()) {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)) });
}

// `pnpm db:migrate`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrateDb().then(
    () => console.log("Database ready: data/instant-resume.db"),
    (e) => {
      console.error(e);
      process.exit(1);
    }
  );
}
