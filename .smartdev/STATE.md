# Smart Dev state: Instant Resume
stage: spec
task: TASK-33
next: write the spec for TASK-33 (form controls and overlays) via shadcn add, restyled to SPEC §11.5, shown on /dev/ui
blockers: none
updated: 2026-11-16 11:57 · session 3

## Numbers
stories: 2 done · 0 review · 0 in progress · 29 to do · 2 parked | tests: 21 unit + 17 e2e pass | commits last session: 9

## Last session
- TASK-1 scaffold and TASK-32 motion foundation built, reviewed, done. Next 16 at repo root; CSP nonce in proxy.ts needs per-request rendering (root layout awaits connection()); e2e always runs on a fresh production build (IR_DEV_UI=1 enables /dev/ui there)
- correction: keep shadcn's built-in animations (tw-animate-css, sonner) as shipped; custom motion only on a specific shared component when deliberately wanted (SPEC §3, §11.5, §12 updated)
- decisions: React <ViewTransition> + addTransitionType('forward'|'back'|'fade') replaces the mock's vt(); shadcn's --accent/--muted keep shadcn meaning (SPEC teal = --primary, muted text = --muted-foreground); TASK-32 split, TASK-33 created
- gotchas: Tailwind v4 scale-* animates CSS scale, not transform; the shell's page ViewTransition crossfades on any untyped transition (warning on TASK-15); startup check reads only the HOST env var
