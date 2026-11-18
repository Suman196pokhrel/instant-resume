---
id: TASK-17
title: 'Structure tab: reorder and hide sections'
status: Review
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T10:38:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can reorder and hide sections without losing them. Refs: SPEC US6, §18.2 Structure tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sections reorder by drag and by Alt+ArrowUp/Down, with a screen reader announcement
- [x] #2 A hidden section disappears from the preview but stays listed as Hidden and can be shown again
- [x] #3 No structure change calls the LLM
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- components/workspace/StructureTab.tsx replaces the placeholder: hint, an ordered list of rows (grip, title, Hidden pill, Move up, Move down, Hide/Show {title}), an sr-only aria-live region. Rows are focusable (aria-label "{title}, position {i} of {n}[, hidden]"); Alt+ArrowUp/Down moves the focused row and keeps focus on it; the announcement reads "{title} moved to position {n}".
- Drag: native HTML5 drag and drop as in the mock (draggable rows, 40% opacity while dragging, 3px accent line above or below the target), not dnd-kit. Keyboard is covered by Alt+Arrow and the buttons, so a dependency buys nothing; SPEC §2 updated.
- Glide: each row wrapped in React <ViewTransition> (as Wizard/AppShell), the change inside startTransition, so rows glide (--t-slow) and reduced motion skips it via the global rule.
- Store: moveSection(id, to) and toggleHidden(id) change the current document and save at once as revision kind "structure": "Moved {title} up/down" (drag: "Moved {title}"), "Hid {title}", "Showed {title}". A pending hand-edit timer is sent first, as Accept does (shared helper).
- No LLM: the mock adapter records each call name in window.__llmCalls when a test defines it (an adapter spy for §18.4 #7).

Files
- components/workspace/StructureTab.tsx (new), Workspace.tsx (mount it), lib/stores/workspace.ts (moveSection, toggleHidden, saveNow helper), lib/llm/mock.ts (spy), app/globals.css only if a token is missing
- docs/SPEC.md §2 (drag: native, no dnd-kit), §14.5 Structure tab (preview glide/flash with TASK-46); mock only if behaviour differs

Tests
- unit store: moveSection reorders and saves "Moved Summary down"; toggleHidden saves "Hid Referees" then "Showed Referees"; a pending edit goes first with its own revision
- e2e AC1: focus the Summary row, Alt+ArrowDown: order Experience, Summary; live region "Summary moved to position 2"; focus stays on the Summary row; PUT revision structure "Moved Summary down"; Move up disabled on the first row, Move down on the last
- e2e AC1 drag: drag Experience onto the top half of Summary: order Experience, Summary
- e2e AC2: Hide Summary: row shows Hidden (dashed), the preview re-renders without the summary text (Copy as plain text or the rendered SVG changes), Content list shows the Hidden pill; Show Summary brings it back
- e2e AC3: after moves and hide, window.__llmCalls is empty
- e2e DoD: everything above by keyboard (Tab to row, Alt+Arrow; Tab to Hide, Enter)

Out of scope
- Preview glide and flash of the moved section (TASK-46, positions), undo (TASK-19), revision coalescing (TASK-19), touch drag
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T10:38:00Z

---

Build done: StructureTab (native drag, Alt+Arrow, buttons, hide/show, aria-live, view-transition glide), store moveSection/toggleHidden via a shared commit helper, mock adapter spy window.__llmCalls. Deviation: document.startViewTransition + flushSync instead of React <ViewTransition> (Zustand updates are synchronous, so React transitions don't animate them). 269 unit + 93 e2e pass.

---
<!-- COMMENTS:END -->
