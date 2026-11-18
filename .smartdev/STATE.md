# Smart Dev state: Instant Resume
stage: review
task: TASK-45
next: spec TASK-20 (rules engine): read SPEC §10 and mock docs.js runChecks; on-device checks (keywords, claims vs KB, banned phrases, parse safety) as pure functions for the Checks panel (TASK-21); alternatives TASK-45 job panel, TASK-47 template calibration
blockers: none
updated: 2026-11-18 22:08 · session 8

## Numbers
stories: 25 done · 0 review · 0 in progress · 14 to do · 8 parked | tests: 280 unit + 98 e2e pass (3 e2e opt-in skips; 2 live checks opt-in) | commits last session: 26

## Last session
- done: TASK-16 rewrite (lib/generate/rewrite.ts, word diff, Instruction box + Proposal card, live on Sonnet 5.5: 3-4 s, ~3,200 in); TASK-17 Structure tab; TASK-18 Design tab; TASK-19 revisions (server coalescing < 60 s per key) + undo (50 steps, bursts). New: TASK-47 template spacing calibration (split from 18)
- decisions: validator rejects blank text (bullets go with remove); summary/paragraph rewrites are grounded in the resume's entries; token note = 380 + chars/2 (fitted live); hand edits locked while a rewrite runs or is pending; native HTML5 drag (no dnd-kit); undo labels are revision labels ("Undid: Moved Summary down"); saves are queued in order and each change keeps its own revision
- gotchas: Zustand updates don't animate with React <ViewTransition>: use document.startViewTransition + flushSync (StructureTab glide); structure reorders apply inside the transition, so e2e must poll; mock adapter spy window.__llmCalls (define it via addInitScript); Ctrl+Z skips text fields only (TEXT_FIELD in Workspace.tsx)
- correction: none new; user keeps going across cards in one session
