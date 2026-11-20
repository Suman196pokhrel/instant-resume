---
id: TASK-55
title: PDF import keeps the addresses behind hyperlinks
status: Done
assignee: []
created_date: '2026-11-20T02:55:00Z'
updated_date: '2026-11-20T02:57:00Z'
labels: []
dependencies: []
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A resume that prints only 'LinkedIn • GitHub • Portfolio' keeps the real URLs in link annotations, which the import never read, so the LinkedIn, GitHub, site and project links were lost (owner's main resume, 2026-11-20).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Reading a PDF appends 'Links in this file:' with each hyperlink's address (mailto as the email), once each, so extraction can fill contact links and project links
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
read-file.ts appends PDF link annotations; extract prompt uses them. e2e import.spec with synthetic linked.pdf. Live (Haiku 5.5, owner's main resume): LinkedIn, GitHub and 3 project links filled; before: none (only 'LinkedIn • GitHub • Portfolio' text). The 'truncated' LinkedIn handle is the real handle (it ends with a hyphen).
<!-- SECTION:NOTES:END -->
