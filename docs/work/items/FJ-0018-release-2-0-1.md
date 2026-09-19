---
id: FJ-0018
title: 'Release 2.0.1'
type: release
status: done
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'Every other item with milestone 2.0.1 is done (FJ-0019, the publish, follows the tag)'
    satisfied: true
    evidence: 'docs/work/README.md'
    verified_by: 'work index: FJ-0014, FJ-0015, FJ-0016, FJ-0017, FJ-0020, FJ-0021 done; FJ-0019 follows the tag'
  - text: 'CHANGELOG.md has a dated 2.0.1 section and package.json says 2.0.1'
    satisfied: true
    evidence: 'CHANGELOG.md'
    verified_by: 'changelog gate; node scripts/changelog.mjs check 2.0.1'
  - text: 'The Release v2.0.1 commit on main is tagged v2.0.1'
    satisfied: true
    evidence: docs/releases/README.md
    verified_by: 'git describe --exact-match 6d856bf prints v2.0.1 (annotated)'
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
- 2026-09-19: done. `Release v2.0.1` is commit 6d856bf on `main`, tagged `v2.0.1` (annotated), after
  `npm run check` passed on it and `npm run check:clean` passed on its parent on both Node lines.
  Not pushed: FJ-0019.
