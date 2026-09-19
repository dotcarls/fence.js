---
id: FJ-0018
title: 'Release 2.0.1'
type: release
status: in-progress
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'Every other item with milestone 2.0.1 is done (FJ-0019, the publish, follows the tag)'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'CHANGELOG.md has a dated 2.0.1 section and package.json says 2.0.1'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'The Release v2.0.1 commit on main is tagged v2.0.1'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0018 — Release 2.0.1

## Description

2.0.0 was tagged but never published: its release pipeline failed. The pushed v2.0.0 tag is not moved; the fixes ship as 2.0.1, the first 2.x on npm.

## Notes

- 2026-09-19: created
- 2026-09-19: an earlier draft of this item claimed the release commit and tag before they existed;
  the review caught it and the claims were withdrawn. They are written after the tag exists.
