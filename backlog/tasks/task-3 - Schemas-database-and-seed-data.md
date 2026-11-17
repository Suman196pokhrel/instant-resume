---
id: TASK-3
title: Schemas, database and seed data
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T10:00:00Z'
labels:
  - m1
dependencies:
  - TASK-32
  - TASK-33
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As the developer, I have Zod schemas, Drizzle tables and a synthetic seed so every feature stores validated data. Refs: SPEC §6, §7.1, §17, §18.1 Schemas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm db:migrate on a fresh clone creates ./data/instant-resume.db with every §7.1 table
- [x] #2 pnpm db:seed loads the synthetic Jordan Whitlock knowledge base and it parses against the KB schema
- [x] #3 Missing required fields, a bullet without a source and theme values outside their ranges fail validation
- [x] #4 Records carry schemaVersion 1 and the migration hook runs on load
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- Add zod@4, drizzle-orm@0.45, @libsql/client@0.18; dev: drizzle-kit@0.31, tsx (runs the db scripts; Node's built-in type stripping would need .ts import extensions everywhere).
- lib/schemas/{kb,brief,theme,document,project,settings}.ts: Zod schemas for SPEC §6 with types from z.infer. Required strings are trimmed and non-empty; optional ones may be "". KB adds schemaVersion: z.literal(1); volunteering and additional default to [] (older KBs). Bullet.source is required and non-empty. Theme: ranges from the §6.3 table, accent #RRGGBB; export THEME_DEFAULTS and THEME_PRESETS. Section: summary/paragraph need text, the other kinds need items. Prefs defaults: A4, en-AU, quick {classic, 2, true, Professional}. Brief length guidance (3–8, 8–15) is LLM prompt guidance, so it isn't enforced here.
- lib/schemas/migrate.ts: upgrade(record, migrations = MIGRATIONS) steps schemaVersion up to CURRENT (1) through a {from: fn} map. v1 is a no-op; a version newer than the app throws "made by a newer version". Used on every load.
- lib/db/schema.ts: the five §7.1 tables (JSON as text with mode json; FKs on delete cascade). lib/db/client.ts: openDb(url = file:./data/instant-resume.db) creates ./data and turns on foreign_keys. Migrations come from drizzle-kit generate and are committed in lib/db/migrations.
- lib/db/kb.ts: writeKb(db, kb) parses, then replaces all kb_entries rows in a transaction (one row per entry; type and position, contact and workRights single rows). readKb(db) assembles the rows, runs upgrade, then parses. Projects and documents I/O is TASK-4.
- Scripts: db:generate (drizzle-kit generate), db:migrate (tsx lib/db/migrate.ts: drizzle migrator, migrations path from import.meta.dirname), db:seed (tsx lib/db/seed.ts: migrate, then writeKb with tests/fixtures/kb.json). Seed refuses when the KB already has entries unless --force, so it can't wipe real data.

Files
- package.json, drizzle.config.ts, lib/schemas/*.ts, lib/db/{schema,client,kb,migrate,seed}.ts, lib/db/migrations/*, tests/fixtures/kb.json (SPEC §17 verbatim)
- tests/unit/schemas.test.ts, tests/api/db.test.ts

Tests
- AC1: run db:migrate (tsx) with cwd = a temp dir → data/instant-resume.db exists with kb_entries, projects, documents, revisions, settings; running it again is a no-op.
- AC2: db:seed in that dir → readKb deep-equals the parsed fixture (Jordan Whitlock, 3 roles, 15 highlights); a second seed exits non-zero and leaves the data; --force replaces it.
- AC3: missing contact.name, role.title and highlight.text fail; a bullet with no source or source "" fails; each theme field just outside its range fails (baseSize 8.5 and 12.5, margin 26, lineHeight 1.75, accent "teal"); THEME_DEFAULTS and every preset parse; a summary without text fails; writeKb rejects an invalid KB and writes nothing.
- AC4: the fixture parses with schemaVersion 1 and empty volunteering/additional; schemaVersion 2 fails parse; upgrade runs an injected v0→v1 step and leaves v1 alone; readKb throws on a row with schema_version 99 (the hook runs on load); deleting a project cascades to documents and revisions.

Out of scope
- Route handlers and 422 responses (TASK-4); JD and brief fixtures and mock-provider scenarios (TASK-10); "Fill with sample" buttons (TASK-7); Next.js bundling config for libSQL (whoever adds the first route that touches the DB).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Zod schemas for SPEC §6 (lib/schemas), schemaVersion upgrade hook on load, Drizzle §7.1 tables + committed migration, readKb/writeKb, db:migrate / db:seed (refuses to overwrite without --force).
Review: pass; follow-ups noted on TASK-4 (unique IDs → 422) and TASK-7 (deep-partial onboarding draft).
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:00:00Z

---

Built in one commit; 77 unit/api + 30 e2e green. Scripts use tsx as CJS (no top-level await). AGENTS.md 'Still to come: db:migrate, db:seed' line is now stale, left for the owner since AGENTS.md has their uncommitted edits.

---
<!-- COMMENTS:END -->
