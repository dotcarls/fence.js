---
id: FJ-0009
title: 'Release 2.0.0'
type: release
status: done
priority: p0
milestone: '2.0.0'
created: 2026-09-16
updated: 2026-09-16
parent: FJ-0001
blocks: []
blocked_by: []
owner: agent
acceptance_criteria:
  - text: 'Every item with milestone 2.0.0 is done'
    satisfied: true
    evidence: docs/work/README.md
    verified_by: 'work index'
  - text: 'CHANGELOG.md has a dated 2.0.0 section and package.json says 2.0.0'
    satisfied: true
    evidence: CHANGELOG.md
    verified_by: 'changelog gate'
  - text: 'v2 is merged into master and the Release v2.0.0 commit is tagged v2.0.0'
    satisfied: true
    evidence: docs/releases/README.md
    verified_by: 'git log; git tag'
links:
  code: []
  docs: [docs/toolchain/release-process.md]
  tests: []
  adrs: [ADR-0008]
---

# FJ-0009 — Release 2.0.0

## Description

Cut 2.0.0 the canonical way (ADR-0008): close the milestone, date the changelog section, bump the version, merge to `master`, commit and tag. Stops short of pushing and publishing, which are FJ-0010.

## Notes

- 2026-09-16: created; in progress in the session that scaffolded the toolchain.
- 2026-09-16: done. `v2` merged into `master` (no fast-forward), `Release v2.0.0` committed and tagged `v2.0.0`. Not pushed: FJ-0010.
