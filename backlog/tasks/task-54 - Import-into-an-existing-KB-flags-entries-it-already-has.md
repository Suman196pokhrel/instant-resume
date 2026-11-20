---
id: TASK-54
title: Import into an existing KB flags entries it already has
status: Done
assignee: []
created_date: '2026-11-20T02:44:00Z'
updated_date: '2026-11-20T02:47:00Z'
labels: []
dependencies: []
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Importing a second version of the same resume in merge mode added every role again (owner's real-run bug, 2026-11-20). Review should say which entries look like ones already saved and offer to leave them out or replace instead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 In merge mode, Review lists draft roles, volunteering, projects and education that look like saved ones (same employer or institution and an overlapping title, or same name)
- [x] #2 'Leave them out' removes those from the draft; 'Replace instead' switches the save behaviour; nothing is dropped silently
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
lib/import/duplicates.ts: duplicates(draft, kb) → { key, index }[] for roles, volunteering, portfolio, education. Words = lowercase letters/digits runs of 3+ chars minus filler (with, and, the, pty, ltd, inc, for, of). Overlap = |A∩B| / min(|A|,|B|). Role: company overlap ≥ 0.6 and title overlap ≥ 0.6. Portfolio: name overlap ≥ 0.8. Education: institution ≥ 0.6 and degree ≥ 0.6. Empty words never match. Onboarding page passes the KB's lists; Review (merge mode, KB exists) shows a warn Callout '{n} entries look like ones already in your knowledge base' listing 'Title, Employer', text 'Saving adds them again.' with buttons 'Leave them out' (drop from draft, PUT) and 'Replace instead'. SPEC §14.1 Review. Mock: skip (mock import has no merge of a second resume; note it). Tests: unit duplicates (the owner's shape synthetic: 'Technical Lead' at 'Capstone with Acme (MapCo)' vs 'Technical Lead and Full-Stack Developer' at 'Capstone, Acme (MapCo), Adelaide Feb 2026'; a different employer; a promotion is flagged — acceptable, the user decides), e2e onboarding: import twice → callout → Leave them out → saved count.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
lib/import/duplicates.ts (shared-word overlap); Review warn callout with Leave them out / Replace instead; mock ported. Tests: unit duplicates.test.ts, e2e import.spec re-import.
<!-- SECTION:NOTES:END -->
