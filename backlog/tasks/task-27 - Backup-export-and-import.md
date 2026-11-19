---
id: TASK-27
title: Backup export and import
status: In Progress
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-19T03:38:00Z'
labels:
  - m10
dependencies:
  - TASK-32
  - TASK-33
  - TASK-35
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can back up everything except my API keys and restore it later. Refs: SPEC §14.6, US12, §18.3, §18.4 #11.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One click exports the KB, projects and settings to a file
- [ ] #2 A deep scan of the export finds no connections, key or apiKey fields
- [ ] #3 Importing the file restores deleted projects and leaves the data unchanged
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach:
- lib/db/backup.ts: exportBackup(db) → { app:'instant-resume', schemaVersion:1, exportedAt, knowledgeBase (readKb, null when none), projects: ProjectBundle[] (readProject for each), prefs }. importBackup(db, input): Zod-parse the whole file (backupSchema: app literal, kbSchema.nullable(), project/document/revision schemas, prefsSchema), then in ONE transaction delete revisions/documents/projects/kb_entries and insert everything, and replace the prefs row. Returns the project count. Connections live in the browser, so nothing touches them.
- Reuse: split writeKb's row building into kbRows(kb); let insertAll take the transaction.
- GET/POST /api/backup (app/api/backup/route.ts) via handle(); invalid → 422 (house convention).
- components/backup/BackupButtons.tsx: ghost 'Export backup' (download icon) fetches GET, downloads instant-resume-backup-YYYY-MM-DD.json via downloadFile, toast 'Exported {file}'; ghost 'Import backup' (upload icon) opens a hidden file input (accept application/json,.json), POSTs the text, toast 'Imported your knowledge base and {n} applications' (singular for 1) + router.refresh(); any failure (bad JSON, 422) → error toast "Import failed: this file isn't a Instant Resume backup".
- Settings: 'Your data' section (copy per SPEC §13.3 item 4) with the buttons. KB top bar gets Import backup + Export backup next to Import resume (SPEC §13.2, mock order: Import resume, Import backup, Export backup).

Files: lib/db/backup.ts, lib/db/kb.ts, lib/db/projects.ts, app/api/backup/route.ts, components/backup/BackupButtons.tsx, app/(shell)/settings/page.tsx, app/(shell)/kb/[section]/page.tsx, tests/api/backup.test.ts, tests/e2e/backup.spec.ts.

Tests:
- api: export holds the KB, every project with documents and revisions, and prefs (AC1)
- api: deep scan of the export finds no connections, key or apiKey fields (AC2)
- api: export, delete a project, import → the project is back and a second export equals the first except exportedAt (AC3)
- api: an invalid file (wrong app, broken project) → 422 and nothing changed
- e2e: Settings Export backup downloads the named file with a toast; Import of a non-backup file shows the failure toast (AC1, AC3 UI). Real import is not run in e2e (shared DB).

Out of scope: merge-style import, onboarding draft in backups.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:34:00Z

---

From TASK-6 spec: the KB top bar's Import backup and Export backup buttons (SPEC §13.2) are built here; TASK-6 leaves room for them next to Import resume.

---
<!-- COMMENTS:END -->
