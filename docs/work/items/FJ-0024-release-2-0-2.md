---
id: FJ-0024
title: 'Release 2.0.2'
type: release
status: done
priority: p0
milestone: '2.0.2'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: [FJ-0025]
blocked_by: [FJ-0022, FJ-0023]
acceptance_criteria:
  - text: 'Every other item with milestone 2.0.2 is done (FJ-0025, the publish, follows the tag)'
    satisfied: true
    evidence: 'docs/work/README.md'
    verified_by: 'work index: FJ-0022 and FJ-0023 done; FJ-0025 follows the tag'
  - text: 'CHANGELOG.md has a dated 2.0.2 section and package.json says 2.0.2'
    satisfied: true
    evidence: 'CHANGELOG.md'
    verified_by: 'changelog gate; node scripts/changelog.mjs check 2.0.2'
  - text: 'The Release v2.0.2 commit on main is tagged v2.0.2, after npm run check:clean passes on it'
    satisfied: true
    evidence: docs/releases/README.md
    verified_by: 'npm run check:clean on 556e3ea, Node 24.21.0 and 26.9.0 (CodeQL 0 findings); git describe --exact-match 556e3ea prints v2.0.2 (annotated)'
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
- 2026-09-19: done. `Release v2.0.2` is commit 556e3ea on `main`, tagged `v2.0.2` (annotated), after
  `npm run check:clean` (the whole chain and CodeQL, on a clean export) passed on it on both Node
  lines. Not pushed: FJ-0025.
