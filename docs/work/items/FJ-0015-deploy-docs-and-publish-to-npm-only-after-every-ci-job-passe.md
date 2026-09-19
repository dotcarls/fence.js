---
id: FJ-0015
title: 'Deploy docs and publish to npm only after every CI job passes'
type: story
status: in-progress
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'One reusable workflow holds every check (all Node legs, the consume job, CodeQL, the docs build)'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Pages deployment runs only after that workflow succeeds on main, and deploys the artifact the checks built'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'npm publishing runs only after that workflow succeeds on the tagged commit, and only for a tag on main whose version matches package.json'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'actionlint reports no findings for the workflows'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0015 — Deploy docs and publish to npm only after every CI job passes

## Description

Docs deployed on every push to master regardless of CI, and the release workflow published on its own partial check. Deployment and publishing must follow a green CI.

## Notes

- 2026-09-19: created
