---
id: FJ-0011
title: 'Async validators: runAsync and AsyncValidator'
type: story
status: backlog
priority: p2
milestone: '2.1.0'
created: 2026-09-16
updated: 2026-09-16
parent: null
blocks: []
blocked_by: []
owner: agent
acceptance_criteria:
  - text: 'Fence.runAsync awaits every step and returns a Result; run() throws InvalidOutcomeError for a Promise outcome as today'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Async validators are typed (AsyncValidator) and the fluent methods infer their parameters the same way'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Memoization works for async steps without caching rejections'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: [docs/design/2026-09-16-v2-proposal.md]
  tests: []
  adrs: []
---

# FJ-0011 — Async validators: runAsync and AsyncValidator

## Description

Designed in the v2 proposal (section 4.9) and deferred from 2.0 to keep the scope. Needs an ADR before it becomes ready.

## Notes

- 2026-09-16: created from the proposal's phase 5.
