---
id: TASK-46
title: Preview section outlines, selection and bullet sources
status: Done
assignee: []
created_date: '2026-11-18T09:34:00Z'
updated_date: '2026-11-19T04:04:00Z'
labels:
  - m6
dependencies:
  - TASK-15
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I see which section I'm editing in the preview and, hovering a bullet, the knowledge base fact it came from. Refs: SPEC §14.5 Preview, §9.1 (Typst query of labelled section positions). Split from TASK-15.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sections in the preview show the hover outline and the selected outline (2px accent), positioned from Typst-labelled section positions
- [x] #2 Selecting a section scrolls the preview to it and flashes it
- [x] #3 In the selected resume section, hovering a bullet shows 'From your knowledge base' and the highlight text, or 'No source found'
- [x] #4 Clicking a section in the preview selects it (SPEC §9.1 nice-to-have; skip if positions make it unreliable)
- [x] #5 Hovering a bullet that a grounding finding points at shows 'Differs from your knowledge base' in amber, with the source text (moved from TASK-21)
- [x] #6 A Checks finding's Go to {section} scrolls the preview to it and flashes it (moved from TASK-21)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach:
- Templates: resume.typ marks each visible section start/end and each bullet start/end with metadata <ir> ((k, id)); letter.typ marks its paragraphs. common.typ adds layout(): one context metadata <ir-layout> with page w/h (pt) and every <ir> mark's page, x, y (query + location().position()).
- Worker: in svg mode also queries <ir-layout> and returns it as RenderResult.layout.
- lib/render/layout.ts (pure): boxes(layout) → section boxes and bullet boxes in % of the stacked sheet (pages stacked, no gap), from start/end marks plus one line of height. Unit-tested.
- Preview overlays (absolute, inside the sheet wrapper, aria-hidden; the Content list stays the keyboard path): each section hover outline accent-line, selected 2px accent, proposed dashed warn + 'Proposed' tag, rewriting shimmer (busy). Click selects (AC4). Hidden while viewing a revision.
- Selected resume section: bullet overlays with the shared Tooltip: 'From your knowledge base' + highlight text (accent tint), 'Differs from your knowledge base' (grounding finding with that bulletId; amber) + source text, or 'No source found' (amber).
- Selection from the Content list or a Checks Go to (any select not started by a preview click) scrolls the section into view (smooth unless reduced motion) and flashes it (animate-flash token, warn-soft fade). Accepting a proposal flashes it too.

Files: lib/render/templates/{common,resume,letter}.typ, lib/render/worker.ts, lib/render/types.ts, lib/render/layout.ts (new), components/workspace/Preview.tsx, app/globals.css (flash keyframes token), tests/unit/layout.test.ts (new), tests/e2e/preview.spec.ts (new).

Tests:
- unit: boxes() maps marks on page 1 and 2 to stacked % positions; bullet box spans start to end line (AC1)
- e2e: selecting a section in Content shows the selected outline over it and flashes it (AC1, AC2)
- e2e: clicking a section in the preview selects it in the inspector (AC4)
- e2e: hovering a bullet in the selected section shows 'From your knowledge base' + the highlight text; a bullet whose source is gone shows 'No source found' (AC3)
- e2e: a bullet with a grounding finding shows 'Differs from your knowledge base' (AC5)
- e2e: Checks 'Go to' flashes the section (AC6)
- render e2e still passes (page counts unchanged by the marks)

Out of scope: dragging in the preview, outlines in Quick generate thumbnails.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Templates mark sections/bullets (<ir>), common.typ layout() reports positions, worker returns RenderResult.layout; lib/render/layout.ts maps to % boxes; SheetOverlay draws outlines (hover, selected, proposed, rewriting shimmer), click-select, scroll+flash on Content/Checks selection and on accept, bullet source tooltips. New tokens: proposed, proposed-soft, flash, animate-flash.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T10:21:00Z

---

From TASK-16: while a rewrite runs the selected section in the preview should shimmer; while a proposal is pending it shows the 'Proposed' styling (the preview already renders pending.after, see Preview.tsx); Accept flashes the section (SPEC §14.5 Proposal card).

---

created: 2026-11-18T11:54:00Z

---

Received AC from TASK-21 (Checks panel); runChecks findings carry bulletId.

---
<!-- COMMENTS:END -->
