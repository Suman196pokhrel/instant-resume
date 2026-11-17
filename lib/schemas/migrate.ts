// schemaVersion migrations (SPEC §6): every stored record is upgraded on load. v1 is current, so there are no steps yet;
// add one per old version, e.g. { 1: (r) => ({ ...r, schemaVersion: 2, … }) }, and bump CURRENT_VERSION.
export const CURRENT_VERSION = 1;

type Versioned = { schemaVersion: number } & Record<string, unknown>;
export type Migrations = Record<number, (record: Versioned) => Versioned>;

export const MIGRATIONS: Migrations = {};

export function upgrade<T extends Versioned>(record: T, migrations: Migrations = MIGRATIONS): T {
  let r: Versioned = record;
  if (r.schemaVersion > CURRENT_VERSION) {
    throw new Error(`This data was saved by a newer version of Instant Resume (schema ${r.schemaVersion}). Update the app to open it.`);
  }
  while (r.schemaVersion < CURRENT_VERSION) {
    const step = migrations[r.schemaVersion];
    if (!step) throw new Error(`No migration from schema version ${r.schemaVersion}.`);
    const next = step(r);
    if (!(next.schemaVersion > r.schemaVersion)) throw new Error(`The migration from schema version ${r.schemaVersion} did not advance it.`);
    r = next;
  }
  return r as T;
}
