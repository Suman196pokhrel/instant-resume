---
id: TASK-3
title: Schemas, database and seed data
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:18:00Z'
labels:
  - m1
dependencies:
  - TASK-32
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As the developer, I have Zod schemas, Drizzle tables and a synthetic seed so every feature stores validated data. Refs: SPEC §6, §7.1, §17, §18.1 Schemas.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm db:migrate on a fresh clone creates ./data/instant-resume.db with every §7.1 table
- [ ] #2 pnpm db:seed loads the synthetic Jordan Whitlock knowledge base and it parses against the KB schema
- [ ] #3 Missing required fields, a bullet without a source and theme values outside their ranges fail validation
- [ ] #4 Records carry schemaVersion 1 and the migration hook runs on load
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
