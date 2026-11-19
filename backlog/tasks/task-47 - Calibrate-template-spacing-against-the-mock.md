---
id: TASK-47
title: Calibrate template spacing against the mock
status: Done
assignee: []
created_date: '2026-11-18T10:43:00Z'
updated_date: '2026-11-19T04:09:00Z'
labels:
  - m6
dependencies: []
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From TASK-15/TASK-18: the Typst resume and cover letter sit tighter than the mock (contact block, skills lines). Tune lib/render/templates/resume.typ and letter.typ so the default theme matches the mock's layout. Refs: SPEC §9.2, §11.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 At the default theme the resume and cover letter preview match the mock's spacing (contact block, section headings, skills lines, bullets) side by side
- [x] #2 The render tests and page counts still pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach: translate the mock's CSS box model into Typst spacing. common.typ gets under()/over()/gap() (CSS line box vs Typst cap-height→baseline frames, Arimo metrics) and lead (one CSS line height); par spacing = lead (CSS p has no margin). Header: name line height 1.1 + .25em, contact/rights .92em with .5em around the separators, .15em before rights. Headings: stack with .15em padding to a .75pt rule, .45em after. Entries .6em apart; ul .25em; li .12em; skill rows .15em. Letter: .letter-meta 1.4 × gap, .9em between blocks and paragraphs, sign-off 1.4em; letter header without the work rights line (SPEC §9.2).
Files: lib/render/templates/{common,resume,letter}.typ.
Tests: side-by-side screenshots against the mock (resume and letter, default theme) (AC1); full unit + e2e incl. render/export/quick page counts (AC2).
Out of scope: per-font metric tuning (Inter, Carlito use Arimo's constants).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Spacing helpers in common.typ convert the mock's CSS margins to Typst baseline→cap gaps; checked side by side with the mock (resume + letter). Letter header no longer shows work rights (SPEC §9.2).
<!-- SECTION:NOTES:END -->
