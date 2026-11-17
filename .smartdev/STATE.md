# Smart Dev state: Instant Resume
stage: spec
task: TASK-6
next: write the spec for TASK-6 (knowledge base screen) on the TASK-4 /api/kb routes and TASK-33 controls, matched to mock views-app.js
blockers: none
updated: 2026-11-17 20:56 · session 4

## Numbers
stories: 8 done · 0 review · 0 in progress · 24 to do · 3 parked | tests: 99 unit/api + 36 e2e pass | commits last session: 22

## Last session
- done: TASK-33 controls/overlays (Segmented = radio group for values, Tabs for views), TASK-2 password lock (proxy gate, HMAC ir_session, Origin 403 in both modes), TASK-3 Zod schemas + Drizzle + db:migrate/db:seed (seed refuses without --force), TASK-4 KB/settings API (split: TASK-35 projects/documents API, also done), TASK-5 Typst spike (WASM 10.8 MB gzip, theme re-render 13 ms)
- decisions: KB changes read-modify-write the whole KB (unique IDs validated); getDb() migrates on first use; lib/render worker warmed only on /projects/[id] and /new/quick; TASK-13/14/15/19/27 now depend on TASK-35; follow-up notes left on TASK-7, 14, 15, 19
- gotchas: tsx runs lib/db scripts as CJS (no top-level await); Base UI menu radio items need closeOnClick; Next's route announcer is role=alert; owner edits SPEC/README/AGENTS/mock in parallel and AGENTS.md still says db:migrate/db:seed "to come"
- correction: keep going across stages in one session until ~50% context; correction: never git add -A, stage only the task's paths (both saved to memory)
