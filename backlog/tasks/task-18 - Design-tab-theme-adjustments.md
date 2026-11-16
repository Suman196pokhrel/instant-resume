---
id: TASK-18
title: 'Design tab: theme adjustments'
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:18:00Z'
labels:
  - m6
dependencies:
  - TASK-32
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can adjust font, sizes, margins, spacing and accent colour and see the result fast, without spending tokens. Refs: SPEC US5, §6.3 theme, §18.2 Design tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each control updates the theme and the preview re-renders, showing 'Rendered in … ms'
- [ ] #2 No design change calls the LLM adapter (asserted with a spy)
- [ ] #3 Reset restores the defaults and is disabled when already at defaults
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
