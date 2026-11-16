---
id: TASK-26
title: Quick generate result, gaps and defaults
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:18:00Z'
labels:
  - m9
dependencies:
  - TASK-32
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I get both documents with their issues listed, and I can fill a gap straight into my knowledge base. Refs: SPEC §14.3, QG, §18.2 Quick generate result, §18.4 #14–15, Settings defaults.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The result heading gets focus and shows 2 thumbnails with their own downloads, the coverage, gaps and findings counts, and the collapsible issue list
- [ ] #2 Download both saves 2 files, gaps never block downloading, and Open in Studio and Regenerate work
- [ ] #3 Add to knowledge base on a gap rejects an empty highlight, saves a real one, and Regenerate uses it as a sourced bullet
- [ ] #4 Settings has the default theme, page budget (1 or 2), cover letter switch and tone, and Quick generate uses them
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
