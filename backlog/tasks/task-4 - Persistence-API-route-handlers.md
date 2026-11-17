---
id: TASK-4
title: Persistence API route handlers
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T10:00:00Z'
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
- [ ] #1 CRUD for the KB and projects works and returns 422 with field errors on invalid bodies
- [ ] #2 Deleting a project removes its documents and revisions
- [ ] #3 Every /api route sits behind the password lock when APP_PASSWORD is set
- [ ] #4 No request or response body ever carries a connection, key or apiKey field
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:00:00Z

---

From TASK-3 review: writeKb relies on the kb_entries primary key to catch duplicate entry IDs (raw SQLite error). Validate unique IDs (refine on kbSchema) so the API returns a readable 422.

---
<!-- COMMENTS:END -->
