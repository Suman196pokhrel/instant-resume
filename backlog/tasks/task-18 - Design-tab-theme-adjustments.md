---
id: TASK-18
title: 'Design tab: theme adjustments'
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m6
dependencies: []
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
