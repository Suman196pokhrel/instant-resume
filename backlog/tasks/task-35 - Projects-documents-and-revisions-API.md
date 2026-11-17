---
id: TASK-35
title: Projects, documents and revisions API
status: Review
assignee: []
created_date: '2026-11-17T10:02:00Z'
updated_date: '2026-11-17T10:14:00Z'
labels: []
dependencies:
  - TASK-4
ordinal: 5001
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As the app, I can create, load, rename, duplicate and delete applications and save their documents with a revision per change. Split from TASK-4. Refs: SPEC §7.2 (projects, documents, revisions), §6.4, §18.3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Project CRUD and duplicate work and return 422 with field errors on invalid bodies
- [x] #2 POST /api/projects creates the project, its documents and their initial revisions in one transaction
- [x] #3 Deleting a project removes its documents and revisions
- [x] #4 PUT /api/documents/:id saves content and theme and appends the revision; GET /api/documents/:id/revisions lists them
- [x] #5 No request or response body ever carries a connection, key or apiKey field
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- lib/db/projects.ts holds all project and document I/O; route handlers stay thin, using handle()/readJson. Every row is validated with the Zod schemas on write and on read (projects go through upgrade() first). A stored document is { content: {sections, recipient}, theme } and is reassembled into documentSchema on read. The server makes every ID (p-, doc-, rev- plus 8 hex) and timestamp (ISO).
- POST /api/projects { project: company, role, location, jdText, brief, selected, source, coverLetterOff?, gaps?, notes?; documents: [{kind, theme, sections, recipient?}] }. Exactly one resume and at most one cover letter. Everything is validated first, then in one transaction: the project, its documents, and one revision per document (kind generation, label "Generated from job brief", snapshot = document). Returns 201 { project, documents, revisions }.
- GET /api/projects: [{ id, company, role, location, updatedAt }], newest first (match counts are TASK-14).
- GET /api/projects/:id: { project, documents, revisions } with revisions newest first. PATCH: only company, role, location, brief, notes, coverLetterOff, selected, gaps; merged, validated whole, updatedAt bumped. DELETE: 204, and the FK cascade removes documents and revisions.
- POST /api/projects/:id/duplicate: copies the project (role + " (copy)", as the mock does), its documents and all revisions with new IDs; revision snapshots point at the new document and project. One transaction; 201 returns it all.
- PUT /api/documents/:id { theme, sections, recipient?, revision: { kind, label, coalesceKey? } }: id, projectId and kind stay fixed. In one transaction: update the document, append the revision (snapshot = saved document), bump the project's updatedAt. Returns { document, revision }. Append only; coalescing is TASK-19.
- GET /api/documents/:id/revisions: newest first.
- Any unknown project or document id is 404.

Files
- lib/db/projects.ts; app/api/projects/route.ts, app/api/projects/[id]/route.ts, app/api/projects/[id]/duplicate/route.ts, app/api/documents/[id]/route.ts, app/api/documents/[id]/revisions/route.ts
- tests/api/projects.test.ts (the access test picks up the new routes automatically)

Tests
- AC1: create, list, get, rename (PATCH role), duplicate (new IDs everywhere, role "… (copy)", same sections, revision snapshots carry the new IDs). 422 with paths for a missing brief, a bullet without a source, two resumes, no resume, PATCH with an invalid brief. 404 for an unknown id on get, patch, delete and duplicate.
- AC2: 201 creates the project, 2 documents and 2 "Generated from job brief" revisions; an invalid body creates no rows at all.
- AC3: DELETE gives 204; the documents and revisions rows for that project are gone; the duplicate survives.
- AC4: PUT saves the new section text and theme, appends a revision (2 in total), ignores a changed id or kind in the body, and moves the project to the top of the list. A bad theme is 422 and saves nothing. The revisions list is newest first.
- AC5: bodies carrying apiKey, key and connection (top level and nested) are stored without them; a deep scan of every response and every stored JSON column finds none.

Out of scope
- Revision coalescing (TASK-19), keyword match counts (TASK-14), checking that bullet sources exist in the KB (patch validation and rules engine), Undo for delete (UI), any UI.
<!-- SECTION:PLAN:END -->
