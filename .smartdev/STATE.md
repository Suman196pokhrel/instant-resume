# Smart Dev state: Instant Resume
stage: spec
task: -
next: board empty and the owner's bug list is fixed (status at the end of bugs_after_manual_review.txt). Ask the owner what's next; candidates: the open item there (thin summaries after fitting), the screens not yet compared with the mock, parked cards
blockers: none
updated: 2026-11-19 17:20 · session 12

## Numbers
stories: 41 done · 0 review · 0 in progress · 0 to do · 11 parked | tests: 340 unit + 144 e2e pass (3 e2e opt-in skips; 3 live checks opt-in) | commits last session: 20

## Last session
- done: the owner's 9 manual-test bugs, verified live with two real resumes (outside the repo) against two real job ads: 1-page resume + 1-page letter every run (pdfinfo). Page budget default 1 on every generation path; fit loop (lib/generate/fit.ts, 24 compiles) repeats content steps, trims skills, fits the letter; Export offers "Fit to 1 page". Preview: page-break gaps, shadow-root SVG, one render at a time; colour picker 200 ms; reorder flash; Add evidence "New role…"; DELETE /api/kb + Settings button
- decisions: imported summary/profile/target-role sections skip the resume skeleton but stay facts; ALL-CAPS headings → sentence case (tidyHeading); employer()/roleAt() hide "Not stated"; regenerate keeps the user's theme unless fitting passes one
- gotchas: a scratch script in the repo root or a commit during `next dev` can start the reload loop: rm -rf ./.next/dev; measure perf on a production build with CPU throttle (headless numbers hide it); never put real resume data in the repo (scratchpad only)
- correction: owner asked to fix the bug list using their real resumes and real job ads, commit, and push without asking (no credentials)
