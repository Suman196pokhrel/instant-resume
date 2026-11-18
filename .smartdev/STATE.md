# Smart Dev state: Instant Resume
stage: spec
task: TASK-51
next: spec TASK-51 (Settings: Quick generate defaults): SPEC §13.3 item 2 + §14.3 "Settings used"; Settings page (app/(shell)/settings/page.tsx) gets theme/page budget/cover letter/tone saved via PUT /api/settings ("Preference saved"); pipeline applies prefs.quick.theme preset (THEME_PRESETS) to both docs. Then TASK-38 (paper/spelling, same section style), 27, 28, 29, 46, 47
blockers: none
updated: 2026-11-18 23:25 · session 10

## Numbers
stories: 34 done · 0 review · 0 in progress · 7 to do · 10 parked | tests: 320 unit + 119 e2e pass (3 e2e opt-in skips; 3 live checks opt-in) | commits last session: 35

## Last session
- done: TASK-20 rules engine, TASK-45 job panel + Regenerate, TASK-21 Checks tab + AddEvidenceDialog, TASK-22 History drawer + restore, TASK-23 Export PDF, TASK-50 match call (lib/match/evidence.ts, live 3.2 s), TASK-24 Quick generate pipeline + progress (lib/generate/pipeline.ts, components/quick), TASK-25 page fitting (lib/generate/fit.ts), TASK-26 Quick result screen. Split off TASK-50 (from 24) and TASK-51 (from 26); flagged-bullet tooltip + preview scroll/flash moved to TASK-46; parked TASK-48, 49
- decisions: numbers compared as tokens, years ignored; cover letter paragraphs may quote the ad's numbers; banned phrases whole words; notes in the workspace store; Regenerate has its own `regenerating` flag; viewing a revision makes the inspector inert; Export disabled with nothing ticked; Quick selection = Studio baseline + match suggestions + evidence owners; fit loop's three 1-page hides are one step; coverage finding below 60%; Quick Regenerate re-reads the KB and deletes the replaced project
- gotchas: one `next dev` per folder (startup e2e fails while the owner's dev server runs); Playwright role queries see inert subtrees; Chrome's scrollIntoView returns a promise, so never return it from an effect; don't run prettier (no config); e2e that writes the KB must add its own entries and avoid Kubernetes (kb.spec counts seed roles, studio.spec needs Kubernetes unbacked)
- correction: user wants cards run back to back without approval or wrap-up stops (picking recommended options); asked to stop after TASK-26 this time
