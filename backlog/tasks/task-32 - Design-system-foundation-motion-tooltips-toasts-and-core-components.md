---
id: TASK-32
title: 'Design system foundation: motion, tooltips, toasts and core components'
status: Done
assignee: []
created_date: '2026-11-16T00:18:00Z'
updated_date: '2026-11-16T01:26:00Z'
labels:
  - m0
dependencies:
  - TASK-1
ordinal: 1500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, every screen feels calm, consistent and responsive because it is built on one shared set of motion tokens, transitions and feedback components ported from the polished mock. Built before any feature screen. Refs: SPEC §11.5 (Button, Tooltip, Toast), §12, §16. Mock: styles.css tokens, core.js Tip, vt(), toasts. Form controls and overlays are TASK-33.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 globals.css holds every §11 colour, type, shape and shadow token and the §12 motion tokens (--t-fast, --t, --t-slow, --ease, --spring), and components use only these, with no one-off values
- [x] #2 Tooltip follows §11.5: 150 ms delay, 300 ms warm window, instant hide, side placement, and it never blocks clicks or outlives its trigger
- [x] #3 With prefers-reduced-motion, every transition and animation is instant (one global rule plus JS checks), verified by a test; a /dev/ui page (development only) shows every component for side-by-side review with the mock
- [x] #4 Button (primary, ghost, danger-ghost, quiet, icon; default and small) and toast (sonner, styled as the mock, 3.2 s or 6 s with an action, error variant) match the mock's look and §12 motion
- [x] #5 Page, step and document changes run as view transitions (React ViewTransition) that clicks pass through; the sidebar stays still, and step changes slide in the direction of travel
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [x] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Approach
- Motion tokens (§12) in app/globals.css: --t-fast 120ms, --t 180ms, --t-slow 280ms, --t-spring 480ms, --ease, --spring (the mock's linear() curve); exposed to Tailwind as ease-standard / ease-spring. One global prefers-reduced-motion rule (transitions, animations and ::view-transition-* to ~0) plus lib/motion.ts prefersReducedMotion() for JS delays and smooth scroll.
- Transitions use React 19.3's <ViewTransition> (Next 16 supports it with no config; it calls document.startViewTransition underneath) instead of porting the mock's vt(). Page change: shell content crossfades 160ms, sidebar named and held still, ::view-transition { pointer-events: none }. Step and document changes: startTransition + addTransitionType('forward' | 'back' | 'fade'), with CSS for each type in globals.css; shown on /dev/ui with a 3-step demo so the pattern exists before Studio needs it.
- Button: shadcn button (Base UI) restyled to §11.5: primary, ghost, danger-ghost, quiet, icon (30×30); default 36px, sm 30px; press scale .97 (icon .9) springing back; disabled 50%.
- Tooltip: shadcn tooltip (Base UI). Provider in the root layout with delay 150 and timeout 300 (warm window). Ink popup, 12.5px text, optional bold title, 8px arrow, max 260px, pointer-events none; enter/exit keep shadcn's built-in animation. Closes on press (Base UI default), Escape, scroll and route change. Placed above, flipping below; the compact sidebar's nav gets side="right" tooltips now.
- Toast: shadcn sonner. Toaster bottom-centre, ink background, action text #8FD6C6, error variant red; sonner's built-in animation. lib/toast.ts wraps sonner's toast so the duration is 3.2s, or 6s when there's an action.
- /dev/ui (app/(shell)/dev/ui/page.tsx): every shared component in every state for side-by-side review with the mock. 404 in production unless IR_DEV_UI=1 (the Playwright web server sets it).
- Guard test: fails if app/ or components/ use a raw hex colour (outside the token blocks in globals.css), or if code outside components/ui uses a raw ms duration, duration-<number> or an arbitrary ease-[…]. shadcn's own files in components/ui keep their built-in motion.

## Files
app/globals.css, app/layout.tsx (Tooltip provider, Toaster), app/(shell)/layout.tsx or components/shell/AppShell.tsx (ViewTransition, sidebar name, compact tooltips), app/(shell)/dev/ui/page.tsx (+ a small client demo component), components/ui/{button,tooltip,sonner}.tsx (shadcn add, then restyled), lib/motion.ts, lib/toast.ts, lib/dev.ts (devUiEnabled), playwright.config.ts (IR_DEV_UI=1), tests/unit/{motion,tokens-guard}.test.ts, tests/e2e/ui.spec.ts, docs/SPEC.md §3, §12 and §23.2 (ViewTransition instead of vt()), mock untouched.

## Tests
- AC1 unit: the guard test passes on the codebase and fails on a fixture string with #fff, 200ms and duration-300. e2e: a button's transition-timing-function on /dev/ui is the spring linear() curve.
- AC4 e2e: mouse down on a primary button scales it to .97 (icon button .9) and it returns to 1 on release. A toast appears bottom-centre with the ink background and role status. It's still there at 2.5s and gone by 4.5s; with an action it's still there at 4.5s. The error variant is red.
- AC2 e2e: a tooltip isn't visible 80ms after hover but is by 400ms. Hovering a second trigger within 300ms of the first closing shows it within 80ms. Pressing the trigger, Escape and scrolling each hide it at once. The popup has pointer-events none, so a click on the element under it lands. Keyboard focus shows it (timing recorded). A compact sidebar tooltip sits to the right of its icon.
- AC5 e2e (startViewTransition spy via addInitScript): a sidebar navigation starts a view transition and the sidebar is named. The /dev/ui step demo passes 'forward' or 'back' as transition types. Two quick clicks on nav links end on the second page (clicks pass through).
- AC3: e2e with reduced motion emulated: a button's transition-duration is ~0 and a nav still swaps pages. Unit: prefersReducedMotion() follows matchMedia. e2e: /dev/ui renders each component. Unit: devUiEnabled() is false in production without IR_DEV_UI=1, true with it, and true in development.

## Out of scope
TASK-33: segmented control, tabs, switch, checkbox, range slider, disclosure, dialog, menu. Other §11.5 parts (pill, chip, count badge, callout, banner, empty state, skeleton, stepper, font cards, swatches, model picker) are built by the first card that uses them, on these tokens. Owner rule: shadcn's built-in animations (tw-animate-css) stay as shipped; a shared component is customised only when we deliberately want different motion (here: the button's spring press). SPEC §3 and §12 updated to say so.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Motion foundation done: tokens + reduced-motion rule, React ViewTransition page crossfade and directional step slides, Button (spring press), Base UI Tooltip (150ms/300ms warm window), sonner Toast via lib/toast.ts, /dev/ui gallery, token guard test. shadcn's built-in animations kept (owner rule).
Review: passed; page crossfade now ignores 'fade' typed transitions; TASK-15 warned about untyped transitions (useDeferredValue) crossfading the page.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-11-16T01:10:00Z

---

Built. 21 unit + 17 e2e green on the production build; ui.spec passed 30/30 over 3 repeats; mutation (tooltip delay 0) caught; dev server clean. Owner rule applied: shadcn's built-in animations kept (tw-animate-css, sonner), custom motion only for the button spring press and view-transition step slides. Tooltip closes on press (click) with shadcn's fade-out, so SPEC wording changed from 'hides instantly'. Tailwind v4 scale-* sets the CSS scale property, so the button transitions scale, not transform. next-themes removed (light only).

---
<!-- COMMENTS:END -->
