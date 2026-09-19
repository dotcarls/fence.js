---
id: FJ-0025
title: 'Publish 2.0.2: push main, then the v2.0.2 tag once CI on main is green'
type: task
status: ready
priority: p0
milestone: '2.0.2'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: [FJ-0024]
owner: 'Tim Carlson'
acceptance_criteria:
  - text: 'git push origin main succeeds and CI on main is green, the CodeQL job included, and Pages deploys'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'The code-scanning alert for js/incomplete-sanitization at tools/gates/generate.ts is closed'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'git push origin v2.0.2, then the Release workflow publishes 2.0.2 under latest with provenance after its checks pass'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: [docs/toolchain/release-process.md]
  tests: []
  adrs: []
---

# FJ-0025 — Publish 2.0.2: push main, then the v2.0.2 tag once CI on main is green

## Description

The owner-only half of the 2.0.2 release: agents never push or publish. It replaces FJ-0019,
whose push ran and whose publish CodeQL stopped.

## Notes

- 2026-09-19: created. The tag is pushed only after CI on `main` passes on the release commit, so
  a failing check costs a push rather than a version number
  ([release-process](../../toolchain/release-process.md#steps)).
