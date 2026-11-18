# Smart Dev state: Instant Resume
stage: review
task: TASK-17
next: spec TASK-16 (rewrite a section): Instruction box + proposal card in components/workspace/ContentInspector.tsx, rewrite call using lib/patch/validate.ts rewriteRules(i); decide the empty-bullet-text case (card comment); TASK-45 job panel is the alternative
blockers: none
updated: 2026-11-18 20:26 · session 7

## Numbers
stories: 21 done · 0 review · 0 in progress · 17 to do · 8 parked | tests: 241 unit + 86 e2e pass (3 opt-in skips; live check opt-in) | commits last session: 29

## Last session
- done: TASK-13 skeleton + patch validator + one generate call; TASK-43 Studio step 4 (generate, compile, save, open); TASK-14 dashboard; TASK-15 Workspace (Typst SVG preview, hand edits, autosave, Copy). New: TASK-45 job panel, TASK-46 preview outlines (split from 15), TASK-44 tooltip flake (parked)
- decisions: one generate call for both documents; Studio matching on device, match call is Quick generate only; a bullet's source must be a highlight of its own entry, only added bullets are source-checked; hand-written RFC 6902 subset (no fast-json-patch); dashboard delete deferred until the Undo toast closes or the page is left; Zustand store per project; worker renders SVG via typst-ts-renderer (no scripts); generate measured 16-18 s, ~7,500 tokens on Sonnet 5.5, strict output OK
- gotchas: live check needs IR_LIVE=1 plus key (tests/unit/generate-live.test.ts); e2e writes need an origin header (CSRF guard); seed has no projects, use tests/e2e/projects.ts makeProject; startup.spec 'pnpm dev' fails while the owner's own pnpm dev runs; quote values in prompts (model copied 'Languages:' into a skills line)
- correction: user wants to keep going across cards in one session, even when it is long
