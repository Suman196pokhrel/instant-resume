---
id: TASK-21
title: Checks panel
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T12:17:00Z'
labels:
  - m7
dependencies:
  - TASK-45
  - TASK-20
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can review the findings and jump to the section each one is about. Refs: SPEC §14.5 Checks, US9, §18.4 #8. Mock: Checks tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The panel shows the verdict, the keyword coverage ring and the missing keywords, with no ATS score
- [x] #2 Clicking a finding selects and focuses its section
- [x] #3 Emphasise prefills the rewrite instruction, and Add it offers the keyword's source
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- The left panel gets a full-width Tabs strip "Job | Checks", with a Count badge that turns warn when there are findings (the mock's .ws-left .seg). New components/workspace/ChecksTab.tsx follows mock renderLeft('checks'):
  - the verdict
  - Job keyword match: a ring that draws in when the tab opens, "{m} of {n}", and the missing keywords with Emphasise or Add it
  - grounding and banned groups, each collapsing to one green line when empty
  - the Parse safety disclosure, open only when something fails, with the no-ATS-score note
  - the footer note
- runChecks (TASK-20) runs on the active document, kb and live notes, debounced 250 ms (SPEC §10) through a small useDebounced in ChecksTab. The tab badge uses the same result: a useChecks hook shared by the strip and the tab.
- Store:
  - leftTab: "job" | "checks", and inspector tab: "content" | "structure" | "design". Both are controlled, so a finding can switch the inspector to Content.
  - goTo(sectionId, prefill?) selects the section, switches to Content and sets a one-shot jump.
  - ContentInspector focuses the section heading (h3 tabIndex -1) on a jump. With a prefill, Instruction starts with it as its draft and focuses the box. The jump then clears.
- Emphasise goes to the first experience section (or the first section), prefilled "Emphasise {keyword}".
- Add it opens new components/kb/AddEvidenceDialog.tsx (SPEC §14.4 gap dialog, mock openAddEvidence; TASK-26 reuses it):
  - "Add it to" is a NativeSelect of roles, volunteer roles and portfolio items, grouped.
  - "What you did and the result" is required; Metric is optional.
  - Save GETs /api/kb, then PATCHes /api/kb/{type}/{id} with the highlights plus the new one: skills are the keyword plus the brief keywords the text matches, and evidenceFor is the keyword.
  - Then it toasts "Added to {entry}" and calls router.refresh(), so the KB prop updates and the checks re-run.
  - With no roles, volunteer roles or portfolio items, it explains that and links to /kb.

Files
- new components/workspace/ChecksTab.tsx (with useChecks and the ring)
- new components/kb/AddEvidenceDialog.tsx
- Workspace.tsx: the left Tabs; inspector Tabs controlled by the store
- ContentInspector.tsx, Instruction.tsx: jump focus and prefill
- lib/stores/workspace.ts: leftTab, tab, jump, setLeftTab, setTab, goTo
- app/globals.css: --animate-ring-in and @keyframes ring-in (from stroke-dashoffset var(--c)); reduced motion is covered by the global rule

Tests
- Unit (store): goTo selects, switches the tab to content, sets the jump and drops a pending proposal; a prefill is carried.
- E2E (tests/e2e/checks.spec.ts), with a project whose resume has a banned phrase, an unsourced number and an odd heading:
  - AC1:
    - The Checks tab badge shows the count, and the verdict reads "{n} things to review".
    - The ring shows "{m} of {n}" and "keywords appear in this resume", and the missing keywords carry Emphasise or Add it with their tooltips.
    - Both groups list their findings. Parse safety is open with the failing heading and its hint, plus the no-ATS note. "ATS score" appears nowhere except inside that note.
    - Fixing the banned phrase by hand updates the count. A clean cover letter shows "Nothing to fix" and the green lines.
  - AC2: clicking a finding switches to Content, opens that section and focuses its heading.
  - AC3:
    - Emphasise opens Experience with the box prefilled "Emphasise {keyword}" and focused.
    - Add it opens the dialog. An empty save shows "Describe what you did".
    - A real save toasts "Added to {entry}", the keyword's row turns to Emphasise, and the KB API shows the highlight with evidenceFor and skills.

Out of scope
- The preview scroll and flash, and the flagged-bullet tooltip (TASK-46)
- The Quick generate gap rows using the dialog (TASK-26)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Checks tab (components/workspace/ChecksTab.tsx, useChecks debounced 250 ms) in the left panel's Job | Checks strip with a warn count; findings goTo their section (store goTo/jump; heading or instruction box focused); Emphasise prefills; Add it opens components/kb/AddEvidenceDialog.tsx (reusable for TASK-26) and refreshes the KB.
Review: fixed a debounce re-render loop and an empty-document guard; 299 unit, 107 e2e pass.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T11:54:00Z

---

Moved AC4 (flagged-bullet tooltip) and the preview scroll/flash on Go to {section} to TASK-46, which owns preview section positions. Build after TASK-45 (left panel).

---
<!-- COMMENTS:END -->
