---
id: TASK-32
title: 'Design system foundation: motion, tooltips, toasts and core components'
status: To Do
assignee: []
created_date: '2026-11-16T00:18:00Z'
labels:
  - m0
dependencies:
  - TASK-1
ordinal: 1500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, every screen feels calm, consistent and responsive because it is built from one shared set of tokens, motion rules and components, ported from the polished mock. Built before any feature screen. Refs: SPEC §11 (tokens, typography, shape, components and shadcn mapping), §12 (motion rules and table), §16. Mock: styles.css tokens and component styles, core.js Tip, vt(), toasts, modals, menus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 globals.css holds every §11 colour, type, shape and shadow token and the §12 motion tokens (--t-fast, --t, --t-slow, --ease, --spring), and components use only these, with no one-off values
- [ ] #2 Shared components match the mock's look and §12 motion: button (press scale), segmented control and tabs (sliding thumb), switch, checkbox, range slider, dialog, menu (pop), disclosure and toast (sonner styled as the mock)
- [ ] #3 Tooltip follows §11.5: 150 ms delay, 300 ms warm window, instant hide, side placement, and it never blocks clicks or outlives its trigger
- [ ] #4 A vt() helper runs page, step and document changes as view transitions that clicks pass through, and falls back to an instant update without support
- [ ] #5 With prefers-reduced-motion, every transition and animation is instant (one global rule plus JS checks), verified by a test; a /dev/ui page (development only) shows every component for side-by-side review with the mock
<!-- AC:END -->
