---
id: FJ-0019
title: 'Publish 2.0.1: push main and the v2.0.1 tag'
type: task
status: cancelled
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
owner: 'Tim Carlson'
acceptance_criteria:
  - text: 'git push origin main --follow-tags succeeds and CI on main is green'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'The Release workflow publishes 2.0.1 under latest with provenance after its checks pass'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'GitHub Pages serves the API reference deployed by CI'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0019 — Publish 2.0.1: push main and the v2.0.1 tag

## Description

The owner-only half of the 2.0.1 release: agents never push or publish.

## Notes

- 2026-09-19: created
- 2026-09-19: ready. `git push origin main --follow-tags` pushes `main` (CI, then Pages) and `v2.0.1`
  (the Release workflow: checks on the tagged commit, then publish). The pre-push hook runs
  `npm run check:clean` first, under mise.
- 2026-09-19: cancelled. The owner pushed `main` and `v2.0.1`. The CodeQL job failed on both runs
  (FJ-0022): CI run 35448397531 on `main`, Release run 35448397495 on `v2.0.1`. Pages did not
  deploy and npm did not receive 2.0.1, which stays tagged and unpublished. Its fixes ship as
  2.0.2, published by FJ-0025.
