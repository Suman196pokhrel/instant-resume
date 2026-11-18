---
id: TASK-21
title: Checks panel
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T11:54:00Z'
labels:
  - m7
dependencies:
  - TASK-45
  - TASK-20
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can review the findings and jump to the section each one is about. Refs: SPEC §14.5 Checks, US9, §18.4 #8. Mock: Checks tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The panel shows the verdict, the keyword coverage ring and the missing keywords, with no ATS score
- [ ] #2 Clicking a finding selects and focuses its section
- [ ] #3 Emphasise prefills the rewrite instruction, and Add it offers the keyword's source
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T11:54:00Z

---

Moved AC4 (flagged-bullet tooltip) and the preview scroll/flash on Go to {section} to TASK-46, which owns preview section positions. Build after TASK-45 (left panel).

---
<!-- COMMENTS:END -->
