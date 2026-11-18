# Smart Dev state: Instant Resume
stage: spec
task: TASK-13
next: spec TASK-13 (generate with patch validation): Studio step 4, match call, skeleton builder, lib/patch/validate.ts, project saved with notes/brief/selection (AC moved from TASK-12); prove live on Anthropic; weigh TASK-41 prompt caching
blockers: none
updated: 2026-11-18 18:50 · session 6

## Numbers
stories: 17 done · 0 review · 0 in progress · 18 to do · 7 parked | tests: 179 unit/api + 73 e2e pass (3 opt-in CORS skips) | commits last session: 20

## Last session
- done: TASK-10 LLM adapter, mock, model picker, LlmError table + LlmErrorCallout; TASK-11 PDF/DOCX/TXT extraction (one consented call also returns each highlight's metric and skills); TASK-42 dev reload loop (stale .next/dev, not reproducible); TASK-12 chooser + Studio steps 1-3. New: TASK-39 (OpenAI/Gemini live check), TASK-40 (403/400/grammar error copy), TASK-41 (prompt caching), all parked
- decisions: Anthropic is the primary provider, prove LLM features live on it first (key in gitignored .env.keys, never commit or print it); model IDs claude-*-5-5, gpt-6.2-sol/astra, gpt-6-luna, gemini-3.8-flash, gemini-3.1-pro-preview, filtered by each key's models list; Studio suggestions on the device (no match call in setup); mock adapter waits 2 s
- gotchas: Anthropic rejects big strict schemas ("compiled grammar is too large"), and Sonnet/Opus 5.5 refuse forced tool use, so big schemas need jsonInPrompt; SDK defaults maxOutputTokens 4096 for unknown IDs; pkill -f "next ..." kills its own shell (stop servers by port pid); shared e2e server KB changes in parallel, so use relative counts; Next route announcer is role=alert (scope alerts to main)
- correction: user wants fewer LLM calls and reusable output stored locally (metric/skills per highlight; caching next); keep going across cards in one session
