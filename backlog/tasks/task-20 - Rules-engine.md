---
id: TASK-20
title: Rules engine
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
labels:
  - m7
dependencies: []
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I'm warned about missing keywords, banned phrases and claims my knowledge base doesn't support. Refs: SPEC §10, §18.1 Rules engine and Parse safety.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Keyword coverage handles exact, hyphen/space and plural matches, sets the inKb flag and ignores hidden sections
- [ ] #2 Banned phrases match on word boundaries with one finding per section
- [ ] #3 Grounding flags '40%' against a 25% source, passes '4.2s to 1.1s', flags unknown tech terms and skills, and ignores years
- [ ] #4 Parse safety fails a non-standard heading with its hint
<!-- AC:END -->
