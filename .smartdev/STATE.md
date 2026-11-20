# Smart Dev state: Instant Resume
stage: spec
task: -
next: board empty except 2 parked cards needing the owner: TASK-30 (public release: approval) and TASK-39 (OpenAI and Gemini keys in .env.keys). Ask the owner what's next; optional polish: compare motion and tooltips with the mock
blockers: TASK-30 needs approval; TASK-39 needs keys
updated: 2026-11-20 14:35 · session 14

## Numbers
stories: 58 done · 0 review · 0 in progress · 0 to do · 2 parked | tests: 364 unit + 152 e2e pass (3 e2e opt-in skips; 3 live checks opt-in) | commits last session: 3

## Last session
- done: Quick error callout and matched chips get icons; toasts size to their text (sonner w-fit + Tailwind translate, which doesn't fight sonner's transform); empty states checked against the mock (already matched)
- done (owner's data, not the repo): cleaned the owner's real KB in data/instant-resume.db: 3 bad roles, app sample entries (UNSW, Tidewatch, Ledgerline), duplicate Master's, split VOD project merged, 2 garbled skill groups folded into the sorted ones, 7 leftover additional sections. Backups: data/instant-resume.before-cleanup{,2}-2026-11-20.db (gitignored)
- gotchas: the owner's existing 3 applications cite removed roles, so their Checks flag unsourced bullets until regenerated; owner's KB still has two conflicting availability dates and no LinkedIn/GitHub in Contact (told the owner)
