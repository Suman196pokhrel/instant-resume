---
id: TASK-9
title: Provider connections and encrypted key storage
status: To Do
assignee: []
created_date: '2026-11-16T00:09:00Z'
updated_date: '2026-11-16T00:18:00Z'
labels:
  - m4
dependencies:
  - TASK-32
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
As a job seeker, I can connect my OpenAI, Anthropic or Gemini key, checked before saving and stored encrypted only in my browser. Refs: SPEC §8.1, §8.2, §13.3, US2, §18.1 Crypto and Key validation, §18.4 #2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Settings shows a connection card for each of the 3 providers
- [ ] #2 A wrong-prefix key shows its error before any request (an sk-ant- key is rejected as an OpenAI key)
- [ ] #3 A test call runs before saving; a rejected key shows a clear error
- [ ] #4 The saved key is AES-GCM encrypted with a non-extractable IndexedDB key, shown masked, and never reaches the server or a backup
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 UI matches the mock's layout, copy, states and motion, using only the shared tokens and components (SPEC §11–12); no one-off colours, durations or easings
- [ ] #2 Keyboard, focus and reduced motion work for everything this card adds (SPEC §16)
<!-- DOD:END -->
