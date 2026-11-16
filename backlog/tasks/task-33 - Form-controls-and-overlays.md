---
id: TASK-33
title: Form controls and overlays
status: To Do
assignee: []
created_date: '2026-11-16T00:51:00Z'
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
- [ ] #1 Segmented control and inspector tabs slide their thumb or underline to the active option with the spring, and work with arrow keys
- [ ] #2 Switch (with On/Off label), checkbox (spring press) and range slider (accent fill, label and tabular value) match §11.5
- [ ] #3 Disclosure turns its chevron 90° and fades its content in
- [ ] #4 Dialog (480px, 720px wide variant) traps focus, closes on Escape, returns focus to the trigger, and springs in over a fading backdrop
- [ ] #5 Menu pops from the corner nearest its button with menu/menuitemradio semantics; every control is on /dev/ui and respects reduced motion
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
