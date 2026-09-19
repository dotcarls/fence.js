---
id: FJ-0016
title: 'Update every npm and GitHub Actions dependency to its latest version'
type: task
status: in-progress
priority: p1
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'Every devDependency is at its latest release, or at the latest release its peers allow, with the exception recorded'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'The lockfile is regenerated so transitive dependencies are current'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Every action is at its latest release, pinned by commit SHA with the version in a comment'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0016 — Update every npm and GitHub Actions dependency to its latest version

## Description

The owner asked for all npm and Actions dependencies to be at their latest versions; Dependabot had opened four failing action-bump PRs.

## Notes

- 2026-09-19: created
