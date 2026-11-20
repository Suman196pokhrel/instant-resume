---
id: TASK-53
title: 'Settings: see the core prompts and layer custom writing instructions'
status: Done
assignee: []
created_date: '2026-11-20T01:40:00Z'
updated_date: '2026-11-20T01:56:00Z'
labels: []
dependencies: []
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a user who doesn't like the default writing, I can read the core system prompts (read-only) in Settings and add my own instructions for the whole resume or for one section, so every generation and rewrite follows them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Settings shows each core prompt read-only
- [x] #2 Add, edit and remove custom instructions targeted at Whole resume, Summary, Experience, Projects, Skills or Cover letter
- [x] #3 Generate and rewrite calls include the matching instructions; they never override the fact rules
- [x] #4 Instructions persist in prefs and backups
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Settings → Writing instructions (prefs.instructions, targets resume/summary/experience/portfolio/skills/coverLetter, max 12 × 600 chars) layered as <user-instructions> on Generate and Rewrite only; Built-in prompts shows the 5 SYSTEM constants read-only. Live check (Sonnet 5.5): 'Experience: under 12 words' + 'Summary: one sentence' took bullets from avg 23 words to 9 and the summary from 3 sentences to 1. Also fixed: a skills reorder that changes a skill (case) is dropped instead of failing the whole generation.
<!-- SECTION:NOTES:END -->
