---
id: TASK-25
title: Page fitting
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T12:47:00Z'
labels:
  - m9
dependencies:
  - TASK-32
  - TASK-33
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, my resume fits my page budget without me fiddling with spacing. Refs: SPEC §9.4, §18.1 Page fit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The fit loop reaches the budget within 8 iterations against a fake compiler, adjusting in order and respecting floors
- [x] #2 With a one-page budget, it then hides Portfolio, Certifications and Referees
- [x] #3 It warns when it can't fit, and emits the expected pages events
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- New lib/generate/fit.ts, fitPages(doc, {budget, keywords, compile, onStep, signal}), returning {doc, pages, fits} (SPEC §9.4). At most 8 compiles. After each compile:
  - pages ≤ budget emits "Fits on {n} pages" (done).
  - Otherwise it applies the next adjustment that can still change the document, in this order:
    1. lineHeight −0.05 (floor 1.15) "Tightening line spacing"
    2. sectionGap −2pt (floor 6) "Reducing space between sections"
    3. margin −2mm (floor 12) "Narrowing the margins"
    4. baseSize −0.5pt (floor 9.5) "Reducing the text size"
    5. drop the lowest-ranked bullet: fewest keyword matches, oldest role first, keeping 2 per role. "Dropping the least relevant bullet"
    6. drop the summary's last sentence. "Shortening the summary"
    7. 1-page budget only: hide Portfolio, Certifications and awards, and Referees in one step. "Hiding Portfolio, Certifications and Referees"
  - Values are clamped to the floors, and an adjustment at its floor (or with nothing to drop) is skipped.
  - With no adjustment left, or after 8 compiles, it returns fits false; the caller shows "Still {n} pages. Trim content in Studio."
- Pipeline stage 4 runs fitPages on the resume, emitting a pages event per step. The cover letter is compiled once. A resume that doesn't fit makes the stage a warning with that note. The fitted resume is what gets saved.
- SPEC §9.4: say that the three 1-page hides are one step, so the loop fits in 8 compiles.

Files
- new lib/generate/fit.ts, tests/unit/fit.test.ts
- lib/generate/pipeline.ts (stage 4)
- tests/unit/pipeline.test.ts (warning case)
- docs/SPEC.md

Tests (fake compiler: pages from theme and content)
- AC1:
  - a doc 1 step over the budget fits after line spacing alone
  - a heavier doc goes through the adjustments in order and stops at the floors (line height never below 1.15, margin never below 12)
  - at most 8 compiles
- AC2: with budget 1 the last step hides portfolio, credentials and referees (hidden: true), and never with budget 2
- AC3: an unfittable doc returns fits false and its steps' value/action events end without "Fits"; the pipeline's fit stage warns "Still {n} pages. Trim content in Studio."
- bullets: a role keeps 2 bullets; the lowest keyword match from the oldest role goes first

Out of scope
- A Studio "Fit to pages" action (SPEC calls it optional)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
lib/generate/fit.ts: at most 8 compiles; line spacing, section gap, margins, text size, least relevant bullet (oldest role, keep 2), summary's last sentence, then (1 page) one step hiding Portfolio, Certifications and Referees; floors respected. Pipeline stage 4 uses it and warns 'Still {n} pages. Trim content in Studio.'
Review: 5 fit tests + 2 pipeline tests; SPEC §9.4 notes the combined hide step. 319 unit, 117 e2e pass.
<!-- SECTION:NOTES:END -->
