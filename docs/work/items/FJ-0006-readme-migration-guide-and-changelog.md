---
id: FJ-0006
title: 'README, migration guide and changelog for 2.0'
type: task
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
  - text: 'README documents install, quick start, concepts, nested results, memoization, serialization, errors, TypeScript usage and performance, with snippets that run as written'
    satisfied: true
    evidence: README.md
    verified_by: 'human: fresh-eyes review ran every snippet with tsx'
  - text: 'MIGRATING maps every 1.x name to its replacement and shows how to convert stored 1.x data'
    satisfied: true
    evidence: MIGRATING.md
    verified_by: human
  - text: 'CHANGELOG follows Keep a Changelog and lists every breaking change'
    satisfied: true
    evidence: CHANGELOG.md
    verified_by: 'changelog gate'
links:
  code: []
  docs: [README.md, MIGRATING.md, CHANGELOG.md]
  tests: []
  adrs: [ADR-0005]
---

# FJ-0006 — README, migration guide and changelog for 2.0

## Description

Phase 4 of the plan.

## Notes

- 2026-09-16: done; rewritten again by FJ-0007 when the compatibility aliases were removed.
