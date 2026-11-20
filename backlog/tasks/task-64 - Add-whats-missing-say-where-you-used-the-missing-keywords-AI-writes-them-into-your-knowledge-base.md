---
id: TASK-64
title: >-
  Add what's missing: say where you used the missing keywords, AI writes them
  into your knowledge base
status: In Progress
assignee: []
created_date: '2026-11-20T15:11:00Z'
updated_date: '2026-11-20T15:11:00Z'
labels: []
dependencies: []
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker whose resume misses several job keywords I have actually used, I can describe in one plain sentence where I used them, and the app writes them up as knowledge base bullets on the right job or project for me to check, so I don't fill in the Add it form once per keyword.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Checks tab shows 'Add what's missing' when at least one missing keyword isn't in the knowledge base; it opens one dialog listing those keywords (all ticked, each can be unticked) and a box to say where you used them
- [ ] #2 Write it makes one LLM call and shows the suggested bullets grouped under the job, volunteer role or project they belong to; each can be unticked or edited, and nothing is saved before Add
- [ ] #3 Suggestions are validated: bullets for unknown entries or with empty text are dropped, keywords are only ones from the list, and a note explains anything the model couldn't place
- [ ] #4 Add saves each ticked bullet as a highlight on its entry (keywords as skills, the matching requirement as evidenceFor), shows a toast, and the saved keywords switch to Emphasise
- [ ] #5 Failures show the shared LLM error callout with Try again; the prompt is listed under Settings built-in prompts; SPEC and mock updated
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach: a fifth tailoring call 'missing' (lib/generate/missing.ts). Input: the user's text, the ticked keywords, the KB's roles, volunteer roles and portfolio items (id, kind, name, dates), spelling. Output {highlights:[{entryId,text,metric,keywords}],note} (strict output, "" = none). Validated on the device: unknown entry ids and blank text dropped, keywords mapped to the listed spelling (others dropped). The model rephrases only what the user said (no new tools, numbers or results). Never creates entries: the manual Add it form keeps New role.
UI: components/workspace/AddMissingDialog.tsx, opened from a button under the Checks tab's missing keywords (only when some aren't in the KB). Step 1: keyword chips (toggle), textarea, Cancel / Write it. Step 2: suggestions grouped by entry, each a checkbox + editable text + keyword chips, note callout, Back / Add {n} to knowledge base. Save: fresh GET /api/kb, one PATCH per entry appending highlights (skills = keywords + any brief keyword the text names; evidenceFor = the first brief requirement naming one of them, else the first keyword). Toast, router.refresh(): the keywords flip to Emphasise.
Files: lib/generate/missing.ts, lib/llm/mock.ts (fixture), components/workspace/AddMissingDialog.tsx, ChecksTab.tsx, app/(shell)/settings/page.tsx (prompt row), docs/SPEC.md (8.3 call 5, 10.1, 13.3, 14.5, 17), mock (views-workspace.js + views-app.js).
No data or API changes (existing PATCH /api/kb/[type]/[id]).
Tests: unit tests/unit/missing.test.ts (prompt carries text, keywords and entries; validation drops unknown ids, blank text, unlisted keywords and canonicalises case; evidenceFor/skills picking; mock fixture places a sentence on the entry it names). e2e tests/e2e/missing.spec.ts (button appears with gaps scenario; untick a keyword; Write it; edit and untick a suggestion; Add saves only ticked, KB has it, keyword switches to Emphasise; Back keeps the text; error scenario shows callout).
Out of scope: creating new roles from the text, writing straight into the resume, editable prompts.
<!-- SECTION:PLAN:END -->
