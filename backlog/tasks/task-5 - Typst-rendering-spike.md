---
id: TASK-5
title: Typst rendering spike
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:18:00Z'
labels:
  - m2
dependencies:
  - TASK-32
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I see my resume and cover letter rendered as real PDFs from my data, fast enough to feel instant. De-risks the biggest unknown early. Refs: SPEC §9.1–9.3, §19 M2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A Web Worker compiles the seed resume and cover letter with the bundled fonts into PDFs
- [ ] #2 A re-render after a theme change is measured and reported; target under 300 ms
- [ ] #3 The PDF text is selectable and its reading order starts with the name
- [ ] #4 The worker is lazy-loaded only on the Workspace and Quick generate pages
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
