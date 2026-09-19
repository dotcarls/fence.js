---
id: FJ-0028
title: 'Verify the automated release on GitHub: first push, first pull request, first promotion'
type: task
status: ready
priority: p1
milestone: null
owner: 'Tim Carlson'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: [FJ-0025]
acceptance_criteria:
  - text: 'The first push to main after d6facd8 runs release.yml green: candidate (no release warranted), every check including commit messages, and Pages deployed'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'A pull request with a nonconforming commit or title fails the commit messages job, and a conforming one passes'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'The first push with a feat or fix commit is tagged vX.Y.Z-rc.1, passes every check, and is promoted: on npm under latest with provenance, tagged vX.Y.Z on the same commit, with a GitHub release carrying the generated notes'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0028 — Verify the automated release on GitHub: first push, first pull request, first promotion

## Description

What FJ-0026 and FJ-0027 could not verify locally: the pipeline's behavior on GitHub-hosted runners and against npm.

## Notes

- 2026-09-19: created
