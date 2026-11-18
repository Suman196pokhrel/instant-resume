---
id: TASK-14
title: Applications dashboard
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T09:24:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
  - TASK-35
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can see my saved applications and reopen one. Refs: SPEC §13.1, US3, §18.4 #12. Mock: views-app.js dashboard.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cards show company, role and last edited, and clicking one opens its Workspace
- [x] #2 With no applications, the dashed box shows 'No applications yet' with a New application button
- [x] #3 Delete removes the card at once with the toast 'Application deleted' and Undo; Undo brings it back and nothing is deleted (SPEC §13.1 and the mock, not a confirm dialog)
- [x] #4 Duplicate adds '{role} (copy)'; search filters cards live by company or role
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- app/(shell)/dashboard/page.tsx (server) reads listProjects(db) and renders <Dashboard projects=…> (client) under TopBar with primary 'New application' (+) linking /new.
- Dashboard: page head (h1, sub, search 'Search company or role', live filter, aria-label 'Search applications'); card grid (auto-fill minmax 250px, gap 14px) of ProjectCard + a dashed 'New application' tile; EmptyState 'No applications yet' with the SPEC copy and a primary New application when there are none; 'No matching applications.' when a search finds none.
- ProjectCard as the mock: monogram (first letter; hue picked from the mock's 6 by char code, colour from a globals.css monogram utility so components stay token-only), role link (15.5px/600, ::after covers the card, focus ring on the card), company, location (muted), footer 'Edited {time ago}'. A ⋯ icon button ('More for {company}') opens the shared DropdownMenu: Open, Duplicate, Delete (danger).
- Delete: hide the card at once and show toast 'Application deleted' with Undo (6 s, lib/toast). The DELETE is sent when the toast's 6 s run out; Undo cancels it. Leaving the page (unmount or pagehide) sends pending deletes with fetch keepalive. Data-safe direction: a closed tab at worst keeps the application.
- Duplicate: POST /api/projects/{id}/duplicate, add the returned project to the list (newest first).
- lib/time.ts timeAgo(iso, now): just now (<45 s), N minute(s), hour(s), day(s) (<14), then weeks, as mock core.js.

Files
- app/(shell)/dashboard/page.tsx; new components/dashboard/Dashboard.tsx; lib/time.ts; app/globals.css (monogram utility)

Tests
- unit tests/unit/time.test.ts: each boundary and singular/plural (SPEC §18.1 time-ago)
- e2e tests/e2e/dashboard.spec.ts (shared seeded server; create projects through POST /api/projects with unique roles): a card shows role, company, location and 'Edited just now'; clicking it opens /projects/{id} (AC1); search narrows to one card and shows 'No matching applications.' for nonsense (AC4); Duplicate adds '(copy)' (AC4); Delete hides it with the toast, Undo restores it and GET /api/projects/{id} is still 200; Delete without Undo -> 404 after the toast ends (AC3); the ⋯ menu works from the keyboard (DoD)
- e2e on an empty server (runOnEmptyServer): the empty state copy and New application link to /new (AC2)

Out of scope
- Setup checklist (TASK-29); keyword match counts on cards (the TASK-4 comment: not in SPEC §13.1 or the mock, so dropped); the Workspace (TASK-15)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Dashboard with cards (monogram, role, company, location, Edited {time ago}), live search, ⋯ menu (Open, Duplicate, Delete), dashed New application tile and empty state; lib/time.ts timeAgo.
Delete is deferred until its Undo toast closes or the page is left (keepalive); a failed DELETE leaves the application in place. Setup checklist stays with TASK-29.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T10:03:00Z

---

From the TASK-4 split: GET /api/projects (TASK-35) lists projects without keyword match counts; add them here.

---

created: 2026-11-18T09:24:00Z

---

Build done: 237 unit + 82 e2e pass. Deviation from plan: the DELETE goes out when the toast closes (sonner pauses on hover, so a fixed 6 s timer could fire while Undo still shows).

---
<!-- COMMENTS:END -->
