---
id: TASK-4
title: Knowledge base and settings API
status: Review
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T10:08:00Z'
labels:
  - m1
dependencies:
  - TASK-32
  - TASK-33
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As the app, I can save and load the knowledge base, projects, documents, revisions and settings through JSON route handlers, never sending API keys. Refs: SPEC §7.2, §18.3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every /api route sits behind the password lock when APP_PASSWORD is set
- [x] #2 No request or response body ever carries a connection, key or apiKey field
- [x] #3 GET /api/kb, PUT contact and work rights, and POST/PATCH/DELETE /api/kb/:type entries work, and invalid bodies (including duplicate IDs) return 422 with field errors
- [x] #4 GET/PUT /api/settings read and save prefs, filling defaults
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- lib/db/client.ts getDb(): one database per process (kept on globalThis for dev reloads); applies migrations on first use, so a fresh clone works without db:migrate. Migrations are found at process.cwd()/lib/db/migrations, because import.meta.url points into Next's bundle. migrateDb takes the folder as a parameter.
- lib/api.ts: handle(fn) wraps each route handler. A ZodError becomes 422 {error:"invalid", issues:[{path:"roles.0.title", message}]}; ApiError(status, error) becomes {error}; anything else is a logged 500 {error:"server_error"} that never echoes input. readJson(request) turns bad JSON into 422 invalid_json.
- kbSchema superRefine: entry IDs and highlight IDs are unique across the whole KB; a duplicate is an issue at its path (TASK-3 note).
- KB routes read, modify, then writeKb, so every change is validated as a whole KB. The KB is tens of rows, and writeKb is one transaction. With no KB yet, GET /api/kb returns null and changes return 409 no_knowledge_base (TASK-7's onboarding creates it).
  - GET /api/kb
  - PUT /api/kb/contact and PUT /api/kb/work-rights: replace the entry; the fixed id is forced.
  - POST /api/kb/[type], where type is roles, volunteering, portfolio, education, skills, credentials, referees or additional (anything else is 404). Appends the entry, filling a missing id (role-, vol-, pf-, ed-, sk-, cr-, ref-, add- plus 8 random hex characters) and missing highlight ids (hl-); returns 201 with the entry.
  - PATCH /api/kb/[type]/[id]: shallow merge, id kept. DELETE: 204. A missing entry is 404.
- Settings: GET /api/settings returns prefsSchema.parse(stored ?? {}); PUT validates (defaults filled), stores it under key "prefs" and returns it.
- No key fields: z.object strips unknown fields, so a stray apiKey, key or connection field never reaches the DB, and responses come only from parsed data.

Files
- lib/api.ts, lib/db/client.ts, lib/db/migrate.ts, lib/schemas/kb.ts
- app/api/kb/route.ts, app/api/kb/contact/route.ts, app/api/kb/work-rights/route.ts, app/api/kb/[type]/route.ts, app/api/kb/[type]/[id]/route.ts, app/api/settings/route.ts
- next.config.ts (serverExternalPackages for @libsql/client, if the build needs it)
- tests/api/kb.test.ts, tests/api/access.test.ts (all routes locked), tests/unit/schemas.test.ts (duplicate IDs)

Tests
- AC1: every app/api/**/route.ts found on disk, called through proxy() for each exported method without a session, returns 401, except POST /api/unlock. New routes are covered automatically.
- AC2: POST, PATCH and PUT bodies carrying apiKey, key and connection fields (top level and nested) are saved without them; a deep scan of every GET response finds none.
- AC3: GET is null before a KB exists, then the seeded KB. PUT contact replaces it and keeps id kb-contact. POST roles returns 201 with generated role- and hl- ids and appears in GET. PATCH changes the title only. DELETE gives 204 and the entry is gone. An unknown type is 404, a missing id is 404, a change before any KB exists is 409. 422 with a field path for a missing title, an empty highlight text, bad JSON, and a POST reusing an existing highlight id.
- AC4: GET settings with nothing stored returns the AU defaults; PUT {paper:"Letter"} keeps the other defaults and persists; PUT {paper:"A3"} returns 422.
- The tables appear on first getDb() with no db:migrate run.

Out of scope
- Projects, documents and revisions (TASK-35); onboarding routes (TASK-7); backup (TASK-27); any UI.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:00:00Z

---

From TASK-3 review: writeKb relies on the kb_entries primary key to catch duplicate entry IDs (raw SQLite error). Validate unique IDs (refine on kbSchema) so the API returns a readable 422.

---

created: 2026-11-17T10:03:00Z

---

Split: projects, documents and revisions routes moved to TASK-35; onboarding routes belong to TASK-7, backup to TASK-27, keyword match counts on the project list to TASK-14, revision coalescing to TASK-19.

---

created: 2026-11-17T10:08:00Z

---

Built in one commit; 88 unit/api + 31 e2e green (new e2e hits /api/settings on the production build). getDb captures the migrations path at module load instead of migrateDb taking a folder parameter.

---
<!-- COMMENTS:END -->
