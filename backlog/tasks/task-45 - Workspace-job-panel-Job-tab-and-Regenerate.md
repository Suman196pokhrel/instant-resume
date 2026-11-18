---
id: TASK-45
title: 'Workspace job panel: Job tab and Regenerate'
status: Review
assignee: []
created_date: '2026-11-18T09:34:00Z'
updated_date: '2026-11-18T12:05:00Z'
labels:
  - m6
dependencies:
  - TASK-15
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I see the job beside my documents: requirements reflected, keywords matched, my notes (editable) and the full ad, and I can regenerate both documents. Refs: SPEC §14.5 Job panel, Job tab and Regenerate dialog. Split from TASK-15.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Job tab shows role, company · location, Requirements '{m} of {n} reflected' with reflected / not reflected / unmarked marks, and Keywords '{m} of {n} in this {document}' as chips
- [x] #2 Your notes are editable and autosave to the project; the Job description is a collapsible full ad
- [x] #3 Regenerate opens the SPEC dialog; confirming regenerates both documents (one call), keeps each theme and adds a revision
- [x] #4 The preview bar toggles the job panel; below 1180px it starts closed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- New components/workspace/JobPanel.tsx: the left column of the Workspace grid (290px; 270px below 1180px; stacked under the bar below 900px, as mock styles.css .ws-body).
- Its content is the Job tab only. TASK-21 adds the Job | Checks strip, so no placeholder tab now.
- Reflected and matched marks use matchedKeywords on the visible text of the active document (sectionText), the same as runChecks.
- Notes move into the workspace store, which already owns saving:
  - Saves are debounced and sent as a PATCH to /api/projects/:id.
  - flush() sends any waiting save with keepalive.
  - Rewrite (Instruction) and Regenerate read the live notes.
- Regenerate:
  - Opens a Dialog with the SPEC copy and the active model's name.
  - Confirming closes the dialog, toasts "Regenerating with {model}…" and dims the sheet (opacity, shared --t).
  - It runs generateDocuments once, with kb, brief, selected, live notes, tone and spelling.
  - The store's regenerate(out) commits each document as a revision ({kind: "generation", label: "Regenerated from job brief"}). It keeps the theme, replaces sections (and the recipient), pushes an undo step and clears the selection and any proposal. Then it toasts "Both documents regenerated".
  - A failure shows LlmErrorCallout above the button, with Try again.
  - While it runs, setBusy(controller) locks hand edits and rewrites (as TASK-16 does), and Cancel isn't offered.
- The toggle:
  - It's an icon button at the start of the preview bar (PanelLeft) with the tooltip "Show or hide the job panel".
  - Store leftOpen: boolean | null. null means the CSS default: open at 1180px and wider, closed below.
  - The first click sets the opposite of what is shown (matchMedia), so the server render and first paint never flash.

Files
- new components/workspace/JobPanel.tsx
- Workspace.tsx: grid column and mount the panel; pass project; notes come from the store
- Preview.tsx: toggle button; dim the sheet while regenerating
- lib/stores/workspace.ts:
  - createWorkspaceStore(docs, project?: {id, notes})
  - new state: notes, leftOpen, regenerating
  - new actions: setNotes, toggleLeft(shown), regenerate(out)
- ContentInspector and Instruction read notes from the store, not props
- SPEC §14.5 and the mock only if behaviour differs (the error callout in the panel; the mock has no failure path)

Data
- None new. PATCH /api/projects/:id already accepts notes; PUT documents takes kind "generation".

Tests
- Unit (workspace-store.test.ts):
  - setNotes sends one PATCH {notes} after the pause; flush sends a waiting one at once.
  - regenerate saves both documents with generation revisions and their own themes, pushes one undo step per document, clears selected and pending; undo restores the previous sections.
  - toggleLeft(shown) sets the opposite.
- E2E (workspace.spec.ts, 1280 wide unless noted):
  - AC1: the Job tab shows the role heading, company · location, "{m} of {n} reflected" with the three marks, and "Keywords {m} of {n} in this resume" chips. Switching to Cover letter updates the counts.
  - AC2: notes edited, then a reload shows them. The Job description disclosure opens to the full ad.
  - AC3:
    - Regenerate opens the dialog with the model name; Cancel makes no LLM call.
    - Confirming makes exactly one "generate" call (window.__llmCalls) and toasts "Both documents regenerated".
    - A theme change made before is kept. The revisions API shows "Regenerated from job brief" for both documents, and Undo brings back the old resume.
  - AC4: the toggle hides and shows the panel. At 1100 wide it starts closed and the toggle opens it.

Out of scope
- The Checks tab and its strip (TASK-21)
- A forced-failure fixture for generate: the error path is checked by hand, unless the mock gets a trigger cheaply
- History drawer (TASK-22)
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T12:05:00Z

---

e2e startup 'pnpm dev' check fails only while the owner's own pnpm dev runs (Next 16 allows one dev server per folder); 102 others pass.

---
<!-- COMMENTS:END -->
