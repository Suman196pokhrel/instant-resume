# Smart Dev state: Instant Resume
stage: spec
task: TASK-13
next: spec TASK-13 (generate documents with patch validation): Studio step 4, the match call, skeleton builder, generate ops validated by lib/patch/validate.ts, project saved with notes/brief/selection; prove live on Anthropic; consider prompt caching (TASK-41) since match+generate both send the KB
blockers: none
updated: 2026-11-17 22:06 · session 5

## Numbers
stories: 13 done · 0 review · 0 in progress · 21 to do · 4 parked | tests: 135 unit/api + 60 e2e pass | commits last session: 33

## Last session
- done: TASK-6 KB screen (shared kb-fields schema, EntryForm), TASK-37 onboarding API (split from TASK-7), TASK-7 onboarding wizard, TASK-8 TXT/paste import (lib/import/parse.ts), TASK-9 provider connections (AES-GCM keystore in IndexedDB); new cards TASK-36 (parked: undo KB delete), TASK-38 (Settings preferences)
- decisions: workRights optional in the KB (SPEC §6.1); onboarding drafts hold incomplete entries, complete validates via writeKb; DB access server-side only (SPEC §3); key test = GET provider models endpoint (CORS verified; Gemini rejects with 400 API_KEY_INVALID); model lists are still mock fixtures; PDF/DOCX show a "arrives with provider" message until TASK-11
- gotchas: e2e uses IR_DB_URL (seeded tmp DB); flows that change the KB run on their own empty-DB server (tests/e2e/server.ts runOnEmptyServer, ports 3103/3104); API requests from tests need an Origin header (403 otherwise); token guard reads copy like "900ms" as a duration (keep such copy in lib/); stale next-servers from Nov 16 on 3110-3113
- correction: user wants DB edits server-side only, never callable loosely from the front end (SPEC §3 updated); TASK-37/7/8/9 were reviewed in the building session, not a fresh one
