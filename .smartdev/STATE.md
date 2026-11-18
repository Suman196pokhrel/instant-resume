# Smart Dev state: Instant Resume
stage: spec
task: TASK-26
next: spec TASK-24 (Quick generate pipeline and progress): read SPEC §14.3 Quick generate and the mock's views-quick.js; reuse extractBrief, generateDocuments, runChecks, fileName and AddEvidenceDialog; then TASK-25, 26 and on in board order
blockers: none
updated: 2026-11-18 23:05 · session 9 (running, autonomous)

## Numbers
stories: 30 done · 0 review · 0 in progress · 9 to do · 10 parked | tests: 303 unit + 113 e2e pass (3 e2e opt-in skips; 2 live checks opt-in) | commits this session: 22

## Last session
- done: TASK-20 rules engine (lib/checks/run.ts), TASK-45 job panel + Regenerate, TASK-21 Checks tab + AddEvidenceDialog (components/kb), TASK-22 History drawer + restore, TASK-23 Export PDF (lib/doc/filename.ts). Moved the flagged-bullet tooltip and the preview scroll/flash to TASK-46. Parked TASK-48 (banned phrases in employer names), TASK-49 (toggle aria-expanded)
- decisions: numbers are compared as tokens and years ignored; banned phrases match whole words; notes live in the workspace store (PATCH project); Regenerate uses its own `regenerating` flag (selection doesn't cancel it); store goTo/jump for Checks jumps; inspector tab and left tab are controlled; viewing a revision makes the inspector inert; Export is disabled with nothing ticked
- gotchas: Next 16 allows one `next dev` per folder (startup e2e fails while the owner's dev server runs); Playwright role queries still see inert subtrees (assert focus instead); a just-opened drawer with a visibility transition can't take focus (flip visibility at once on open); don't run prettier (no config: it reformats whole files); e2e that writes the KB must use its own entries (kb.spec and studio.spec read the seed in parallel)
- correction: the user wants cards run back to back without stopping for approval or wrap up; pick the recommended option
