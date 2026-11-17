---
id: TASK-15
title: Workspace preview, hand edits and autosave
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-17T10:22:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can edit any section by hand and see the preview update right away, with everything saved automatically. Refs: SPEC §14.5, US8, §18.2 Content tab. Mock: views-workspace.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Workspace shows the job panel, document tabs, preview and Content inspector as in the mock
- [ ] #2 Typing in a section updates the preview immediately
- [ ] #3 The save state goes Saving to Saved, and edits survive a reload
- [ ] #4 Copy text puts the document's plain text on the clipboard
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

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
<!-- COMMENTS:END -->
