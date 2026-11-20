---
id: TASK-63
title: Typing doesn't re-render the whole Workspace
status: Done
assignee: []
created_date: '2026-11-20T09:29:00Z'
updated_date: '2026-11-20T09:29:00Z'
labels: []
dependencies: []
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fast lane: the Workspace frame subscribed to the whole document (for its Copy button), so every key re-rendered the preview, job panel, inspector and tabs from the top.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The frame subscribes only to whether a document exists; Copy reads the document when clicked
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
40-key burst at 4x CPU: keystroke handling (keypress + textInput + input) 1,700 -> 1,089 ms; JS 1,282 -> 1,082 ms; latency unchanged. Tried contain: content on the sheet: no change, reverted. Copy test in workspace.spec still passes.
<!-- SECTION:NOTES:END -->
