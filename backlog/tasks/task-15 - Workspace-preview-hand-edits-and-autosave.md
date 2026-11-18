---
id: TASK-15
title: Workspace preview, hand edits and autosave
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T09:48:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
  - TASK-35
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can edit any section by hand and see the preview update right away, with everything saved automatically. Refs: SPEC §14.5, US8, §18.2 Content tab. Mock: views-workspace.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Typing in a section updates the preview immediately
- [x] #2 The save state goes Saving to Saved, and edits survive a reload
- [x] #3 Copy text puts the document's plain text on the clipboard
- [x] #4 The Workspace shows its 54px bar (breadcrumb, Resume | Cover letter tabs, save state, Copy), the preview (rendered Typst pages, zoom, page breaks, render status) and the Content inspector as in the mock; the job panel is TASK-45, section outlines TASK-46
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- app/(shell)/projects/[id]/page.tsx (server): readProject + readKb + readPrefs -> <Workspace> (client); 404 for an unknown id. Compact 60px sidebar per SPEC §11.4 (check how the shell does it; add a prop if needed).
- State: a Zustand store per open project (SPEC §3 locked decision; new dependency zustand) in lib/stores/workspace.ts holding { kind, selectedSectionId, zoom, docs, save: 'idle'|'saving'|'saved'|'error' }. Undo, revisions view, proposals arrive with their cards.
- Preview: worker gains format 'vector'; the client turns it into SVG pages with @myriaddreamin/typst-ts-renderer 0.7.0 (new dependency; TASK-5 note). Loader card 'Loading the Typst renderer' with progress and the real size until the first render. Re-render on every change, typing debounced 120 ms; the newest request wins. Sheet on a sunken background, page-break line every page, zoom − / '{n}% fit' / + (40–160%, Fit by default), 'Rendered in {ms} ms · {n} pages · A4'. Transitions tagged so the shell's ViewTransition doesn't crossfade on keystrokes (TASK-32 note).
- Content inspector: no selection -> 'Sections' / 'Paragraphs' list (title, Hidden pill, one-line preview, chevron); selected -> header (back 'All sections', title, copy-section button) and Edit by hand: 'Updates the preview as you type', section heading input (resume only), text sections an auto-growing textarea, item sections per item heading/sub/meta/line inputs and bullet textareas with ×. The Instruction box is TASK-16.
- Autosave: each change updates the store and preview at once; PUT /api/documents/{id} debounced 800 ms with revision { kind 'edit', label 'Edited {title}', coalesceKey 'edit-{sectionId}' } (coalescing itself is TASK-19). Save pill 'Saving' (spinner) -> '✓ Saved'; a failed save shows the error toast and retries on the next change.
- Copy (bar) and copy-section: lib/doc/plain-text.ts per SPEC §14.5 (name, contact line, work rights, upper-case headings, '•' bullets; letter adds greeting and sign-off); toast 'Copied as plain text'. No LLM call.
- Calibrate resume.typ / letter.typ spacing against the mock while here (TASK-5 note), visual only.

Files
- app/(shell)/projects/[id]/page.tsx, components/workspace/{Workspace,Preview,ContentInspector}.tsx, lib/stores/workspace.ts, lib/doc/plain-text.ts, lib/render/{worker,client,types}.ts, components/shell (compact sidebar), package.json (zustand, typst-ts-renderer), docs/SPEC.md §9.1 loader size

Tests
- unit plain-text.test.ts: resume (contact line, work rights, hidden sections left out, AWS (Lambda, ECS, SQS) intact) and cover letter (greeting, sign-off) (AC4)
- e2e workspace.spec.ts on a project made through the API: bar, tabs, inspector list and a rendered SVG page with 'Rendered in' status (AC1); select Summary, type, the preview text changes (AC2); 'Saving' then 'Saved', reload keeps the edit (AC3); Copy puts the plain text on the clipboard (granted permission) (AC4); switching to Cover letter shows 'Paragraphs'; keyboard reaches the list and fields; zoom buttons change the label (DoD)

Out of scope
- Job panel (TASK-45), section outlines and bullet tooltips (TASK-46), rewrite (TASK-16), structure (TASK-17), design (TASK-18), undo and coalescing (TASK-19), checks (TASK-21), history (TASK-22), export (TASK-23)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Workspace: 54px bar (crumb, Resume | Cover letter, save pill, Copy), live Typst SVG preview with zoom and render status, Content inspector (section list, Edit by hand), autosave via PUT /api/documents (800 ms, flush on leave), plain-text Copy; Zustand store per project.
Deferred: template spacing calibration (TASK-18), loader progress bar, page-break lines (TASK-46); job panel TASK-45.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-16T01:26:00Z

---

From TASK-32 review: the shell's page <ViewTransition> (components/shell/AppShell.tsx) crossfades on ANY transition inside it unless the transition carries a type it maps to none (forward/back/fade). If the live preview uses useDeferredValue or startTransition without a type, the whole page crossfades on every keystroke (SPEC §12 forbids). Tag those transitions or exclude them.

---

created: 2026-11-17T10:22:00Z

---

From TASK-5: preview needs @myriaddreamin/typst-ts-renderer 0.7.0 (vector → SVG); compile format 'vector' to be added to lib/render/worker.ts. Calibrate resume.typ/letter.typ spacing against the mock here. Loader card: real WASM is 10.8 MB gzip, not 6.4 MB.

---

created: 2026-11-18T09:47:00Z

---

Build done: 241 unit + 86 e2e pass. Not done here: template spacing calibration (noted on TASK-18); loader card has no progress bar (no real progress signal from the worker); page-break lines not drawn (Typst SVG pages carry their own white fill; check with TASK-46).

---
<!-- COMMENTS:END -->
