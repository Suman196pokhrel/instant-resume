import sample from "../../tests/fixtures/kb.json";
import { openDb } from "./client";
import { writeKb } from "./kb";
import { migrateDb } from "./migrate";
import { kbEntries } from "./schema";

// `pnpm db:seed [--force]`: loads the synthetic Jordan Whitlock knowledge base (SPEC §17).
async function main() {
  const db = openDb();
  await migrateDb(db);
  const existing = await db.select({ id: kbEntries.id }).from(kbEntries).limit(1);
  if (existing.length && !process.argv.includes("--force")) {
    throw new Error("The knowledge base already has entries. Run `pnpm db:seed --force` to replace them with the sample.");
  }
  await writeKb(db, sample);
  console.log("Seeded the sample knowledge base (Jordan Whitlock).");
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
