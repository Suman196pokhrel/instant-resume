---
id: TASK-43
title: Studio generate screen and project save
status: To Do
assignee: []
created_date: '2026-11-18T08:31:00Z'
labels:
  - m5
dependencies:
  - TASK-13
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I watch my resume and cover letter being generated, then land in the Workspace of a new project that keeps my notes, brief and selection. Refs: SPEC §14.4 step 4, US4. Mock: views-new.js generate(). Split from TASK-13 (the core it calls).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Generation creates a project (one generate call, ops validated) and opens /projects/[id]; the resume and cover letter compile with the Typst templates first (showing the preview is TASK-15)
- [ ] #2 Notes, brief and selection from the Studio draft are saved with the project, and the draft is cleared only after the save succeeds
- [ ] #3 Step 4 shows the stages, elapsed time and ghost page as in the mock; a failure shows the stage in red and a callout with Retry, Switch model and Back to entries, and nothing is saved
- [ ] #4 Proven live on Anthropic: the generated documents pass the validator; tokens and time measured and noted in SPEC §8.3
<!-- AC:END -->
