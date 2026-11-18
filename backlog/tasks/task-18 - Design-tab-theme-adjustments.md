---
id: TASK-18
title: 'Design tab: theme adjustments'
status: Done
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-18T11:07:00Z'
labels:
  - m6
dependencies:
  - TASK-32
  - TASK-33
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can adjust font, sizes, margins, spacing and accent colour and see the result fast, without spending tokens. Refs: SPEC US5, §6.3 theme, §18.2 Design tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each control updates the theme and the preview re-renders, showing 'Rendered in … ms'
- [x] #2 No design change calls the LLM adapter (asserted with a spy)
- [x] #3 Reset restores the defaults and is disabled when already at defaults
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- components/workspace/DesignTab.tsx replaces the placeholder, as the mock: accent-soft note "Instant, and free. Design changes go straight to the renderer. No LLM call, no tokens." (zap); Font: 3 radio cards (Aa sample in that font, name); Sizes: Body text 9-12 pt step 0.5, Section headings 10-15 pt step 0.5, Your name 16-30 pt step 1; Spacing: Page margins 10-25 mm, Line spacing 1.1-1.7 step 0.05, Space between sections 4-24 pt; Accent colour: the 5 ACCENT_SWATCHES (aria-pressed, "Accent #0E7466") plus a custom colour input ("Custom accent colour"); footer "Reset to template defaults" (disabled at defaults) and "Last render {ms} ms". Uses the shared Slider (components/ui/slider).
- Store: setTheme(patch) updates the current document's theme now and saves debounced as { kind: "adjustment", label: "Adjusted design", coalesceKey: "design" }; resetTheme() saves at once as "Reset design to template defaults" (via commit). Each document keeps its own theme.
- Preview: a theme-only change renders without the 120 ms debounce and the status gets the zap icon (mock renderPreview({ design: true })); the store exposes the last render ms for the footer.
- No LLM: the e2e asserts window.__llmCalls stays empty (the TASK-17 spy).

Split
- Template spacing calibration against the mock (the TASK-15 comment on this card) moves to a new To Do card: it is visual tuning of resume.typ/letter.typ, not a Design tab control.

Files
- components/workspace/DesignTab.tsx (new), Workspace.tsx (mount), Preview.tsx (no debounce + zap for theme-only changes, report ms), lib/stores/workspace.ts (setTheme, resetTheme, lastRenderMs), app/globals.css (a custom-swatch utility for the conic gradient, if the tokens guard needs it)
- docs/SPEC.md §14.5 Design tab only if behaviour differs; mock unchanged unless it does

Tests
- unit store: setTheme applies at once and saves once after the debounce with "Adjusted design" / coalesceKey design; resetTheme restores THEME_DEFAULTS and saves at once
- e2e AC1: Body text slider by keyboard (focus, ArrowRight): shows 11 pt, the preview SVG changes, the status reads "Rendered in … ms" with the zap; choosing the Inter card and an accent swatch (aria-pressed) each change the SVG; the footer shows "Last render {n} ms"
- e2e AC2: after those changes window.__llmCalls is empty
- e2e AC3: Reset is disabled at defaults, enabled after a change; Reset puts Body text back to 10.5 pt and disables itself; PUT labels "Adjusted design" then "Reset design to template defaults"
- e2e: the cover letter keeps its own theme (resume change, Cover letter tab still at defaults)
- e2e DoD: font cards by arrow keys (radio group), swatches by Tab and Enter

Out of scope
- Undo of design bursts (TASK-19), coalescing within 60 s (TASK-19), page fitting (TASK-25), presets (Quick generate)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Design tab: font cards, six sliders, swatches + custom colour, Reset (disabled at defaults), Last render; design-only changes render without the debounce, with the zap; saved as one 'Adjusted design'; spy proves no LLM call.
Review: sample fonts load, slider values save clean; per-document single pending label noted on TASK-19. Template calibration is TASK-47.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-18T09:47:00Z

---

From TASK-15: calibrate resume.typ/letter.typ spacing against the mock (contact block and skills lines sit tight in the Typst preview).

---

created: 2026-11-18T10:52:00Z

---

Build done: DesignTab (font radio cards, 6 sliders, swatches + custom colour, Reset, Last render), store setTheme (debounced 'Adjusted design', key design) / resetTheme (at once), Preview renders design-only changes without the debounce and shows the zap. Template calibration split to TASK-47. 271 unit + 95 e2e pass.

---
<!-- COMMENTS:END -->
