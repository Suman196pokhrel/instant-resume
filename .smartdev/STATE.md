# Smart Dev state: Instant Resume
stage: spec
task: -
next: board empty except 2 parked cards that need the owner: TASK-30 (public release: approval) and TASK-39 (OpenAI and Gemini keys in .env.keys). Remaining polish: compare motion, toasts, empty and error states with the mock
blockers: TASK-30 needs approval; TASK-39 needs keys
updated: 2026-11-20 13:54 · session 13

## Numbers
stories: 57 done · 0 review · 0 in progress · 0 to do · 2 parked | tests: 359 unit + 147 e2e pass (3 e2e opt-in skips; 3 live checks opt-in) | commits last session: 20

## Last session
- done: settings Writing instructions + read-only Built-in prompts (TASK-53); parked cards 34, 49, 48, 44, 40, 36, 41, 52, 31; real-run bugs 54-59 (re-import duplicates flagged, PDF hyperlinks imported, two-sentence summary, decimals kept when shortening, short clickable header links, short file names); Quick, Workspace, Export, History and onboarding matched to the mock
- decisions: instructions layer on Generate and Rewrite only (never brief/match/import); prompt caching via GenerateArgs.cachePrefix (match caches the KB, generate its whole prompt); local mode answers only loopback Host names; Dockerfile runs as node with data in a volume
- gotchas: Next allows one `next dev` per folder (startup.spec fails while another runs); links styled with buttonVariants need merged classes (fixed in button.tsx); the owner's LinkedIn handle really ends with "-"
- correction: live-run findings went into a card and a test with the owner's name and employer; rewrote unpushed commits. Write them with synthetic names (memory: live-run-data-scrub)
