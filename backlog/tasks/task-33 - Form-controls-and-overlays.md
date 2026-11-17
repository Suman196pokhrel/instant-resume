---
id: TASK-33
title: Form controls and overlays
status: Done
assignee: []
created_date: '2026-11-16T00:51:00Z'
updated_date: '2026-11-17T09:45:00Z'
labels:
  - m0
dependencies:
  - TASK-32
ordinal: 1700
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, every choice, toggle and dialog behaves the same everywhere and feels like the mock. Refs: SPEC §11.5 (Segmented control, Tabs, Switch, Checkbox, Range slider, Disclosure, Dialog), §12, §16 (dialogs trap focus, menus use menu semantics). Mock: styles.css and core.js modals and menus. Builds on TASK-32's tokens and /dev/ui page.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Segmented control and inspector tabs slide their thumb or underline to the active option with the spring, and work with arrow keys
- [x] #2 Switch (with On/Off label), checkbox (spring press) and range slider (accent fill, label and tabular value) match §11.5
- [x] #3 Disclosure turns its chevron 90° and fades its content in
- [x] #4 Dialog (480px, 720px wide variant) traps focus, closes on Escape, returns focus to the trigger, and springs in over a fading backdrop
- [x] #5 Menu pops from the corner nearest its button with menu/menuitemradio semantics; every control is on /dev/ui and respects reduced motion
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Approach
- \`pnpm dlx shadcn add tabs switch checkbox slider collapsible dialog dropdown-menu\` (base-nova, Base UI), then restyle each to SPEC §11.5 / mock styles.css with existing tokens only. Keep shadcn's built-in animations except where SPEC §12 names custom motion: segmented thumb, tab underline, switch knob, checkbox press (--spring); dialog panel spring; menu "pop".
- Tabs gets variant segmented (sunken track, white thumb) | underline (inspector, 2px accent bar); both slide Base UI's Tabs.Indicator (--active-tab-left/width) with --spring. Used for view switches (Document tabs, Job/Checks, inspector).
- Segmented (new, value choices: paper size, spelling, page budget) on Base UI RadioGroup + Radio (radiogroup semantics, arrow keys), same look; thumb slides via inline --i/--n from the selected index (mock's .seg).
- Switch renders its own "On"/"Off" text (aria-hidden, toggled by data-checked); Slider takes label and renders Slider.Value (tabular) above the track; thumb grows on data-dragging.
- Dialog: 480px, size="wide" 720px; header title + close ×, footer right-aligned, danger-ghost pushed left. Base UI gives focus trap, Escape, focus return. Menu: Base UI Menu, origin from the positioner's --transform-origin; RadioGroup/RadioItem = menuitemradio.

Files
- components/ui/{tabs,segmented,switch,checkbox,slider,collapsible,dialog,dropdown-menu}.tsx (segmented hand-written; others from shadcn add, restyled)
- app/globals.css: pop keyframe only if no token-based utility fits
- components/dev/Gallery.tsx: sections "Segmented and tabs", "Toggles", "Slider", "Disclosure", "Dialog", "Menu"
- tests/e2e/ui.spec.ts; docs/SPEC.md §11.5: one line each for Segmented = radio group vs Tabs = view switch
- No data or API changes.

Tests (e2e on /dev/ui, real browser for motion)
- AC1: clicking an option moves the segmented thumb and the tab underline (position changes; transition-timing-function contains linear(); ArrowRight moves selection and focus; aria-checked / aria-selected follow.
- AC2: Switch toggles aria-checked and the visible text On/Off; Space toggles. Checkbox press reaches scale .86 then springs back; Space checks it. Slider: ArrowRight bumps the value shown in the tabular output; fill width grows; label is associated (getByRole("slider", { name })).
- AC3: Disclosure chevron computed rotate 90deg when open; content visible with a running opacity animation; Enter toggles.
- AC4: Dialog width 480 / wide 720; Tab cycles inside; Escape closes; focus returns to the trigger; backdrop opacity transitions; panel transition uses linear(.
- AC5: Menu has role=menu and menuitemradio with aria-checked; ArrowDown moves focus, Enter selects, Escape closes and refocuses the button; transform-origin is the corner nearest the button.
- Reduced motion: thumb/underline/dialog transition durations ~0; the gallery heading list includes the new sections.
- tokens-guard unit test stays green.

Out of scope
- Select, inputs/textarea, chips, pills, callouts, stepper, swatches, font cards, model picker (TASK-10).
- Wiring the controls into real screens (their own cards).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Segmented (radio group), tabs (segmented/underline), switch, checkbox, slider, disclosure, dialog and menu restyled to SPEC §11.5 with spring motion per §12, all on /dev/ui; 13 new e2e tests.
Review: all ACs verified (21 unit + 30 e2e green), no on-load animation; fast-lane fix for Segmented style merge and control mode.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-17T09:35:00Z

---

Spec approved by owner 2026-11-17; next: build.

---

created: 2026-11-17T09:44:00Z

---

Built in one commit (eb9d6c1). Deviations: tests in tests/e2e/controls.spec.ts (not ui.spec.ts); Slider takes unit prop (Intl has no 'point'); RadioItem closes menu on pick by default; Button now sets data-variant (dialog footer pushes danger-ghost left); radio-group.tsx from shadcn add dropped (Segmented uses Base UI directly). Three test fixes during build were test assumptions (offscreen mouse, keyboard-open highlights first item, fade timing), not component changes.

---
<!-- COMMENTS:END -->
