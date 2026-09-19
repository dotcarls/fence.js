---
id: FJ-0024
title: 'Release 2.0.2'
type: release
status: in-progress
priority: p0
milestone: '2.0.2'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: [FJ-0025]
blocked_by: [FJ-0022, FJ-0023]
acceptance_criteria:
  - text: 'Every other item with milestone 2.0.2 is done (FJ-0025, the publish, follows the tag)'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'CHANGELOG.md has a dated 2.0.2 section and package.json says 2.0.2'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'The Release v2.0.2 commit on main is tagged v2.0.2, after npm run check:clean passes on it'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: [CHANGELOG.md]
  tests: []
  adrs: []
---

# FJ-0024 — Release 2.0.2

## Description

2.0.1 was tagged and pushed but never published: its Release workflow failed at CodeQL
(FJ-0022). The pushed v2.0.1 tag is not moved; the fix ships as 2.0.2.

## Notes

- 2026-09-19: created
