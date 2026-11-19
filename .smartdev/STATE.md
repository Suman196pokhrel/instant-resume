# Smart Dev state: Instant Resume
stage: spec
task: -
next: board empty (all M0–M11 cards done). Owner decides how to handle bugs_after_manual_review.txt (their manual-test list + run notes at the end); turn the chosen items into cards (fast lane for small ones) and start with the first they pick
blockers: none
updated: 2026-11-19 15:03 · session 11

## Numbers
stories: 41 done · 0 review · 0 in progress · 0 to do · 11 parked | tests: 331 unit + 139 e2e pass (3 e2e opt-in skips; 3 live checks opt-in); fresh clone passes | commits last session: 23

## Last session
- done: TASK-51 Quick defaults (Settings section, theme preset into generation), TASK-38 paper/spelling, TASK-27 backup (lib/db/backup.ts, /api/backup), TASK-28 unlock screen + Settings → Access, TASK-46 preview overlays from Typst marks (layout() in common.typ, lib/render/layout.ts, SheetOverlay), TASK-47 template spacing from the mock's CSS, TASK-29 setup checklist + a11y sweep (AC5 partial: unreviewed screens listed in the bugs file); parked dev-only sample JDs
- decisions: one PrefsSettings state so each full-prefs PUT can't clobber; validation errors are 422; KB top bar hides backup buttons below 900px; proxy redirects to an absolute URL on the forwarded host (relative Location made password mode 500); --muted is #5F6964 (AA) in app, SPEC and mock; class-less links are underlined; letter header has no work-rights line
- gotchas: e2e on a file's own server (runOnEmptyServer(port, { env, seed })) must take Origin from page.url(); Next's route announcer is also role=alert, so scope alerts; a scratch .mjs in the repo root sends `next dev` into a reload loop (keep scripts in the scratchpad); e2e DB is shared, so prefs/backup writes are stubbed or done on own servers
- correction: owner said finish every ticket without asking, fix small bugs on the way, log big ones in bugs_after_manual_review.txt; the bug list waits for their instructions
