---
id: FJ-0021
title: 'Fence.run is 2.4-3.3x slower since the first review round'
type: bug
status: done
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'The benchmark of the current code is within 10% of the first rewrite (b96f21c) on both cases, measured interleaved on the same Node'
    satisfied: true
    evidence: 'docs/work/items/FJ-0021-fence-run-is-2-4-3-3x-slower-since-the-first-review-round.md#notes'
    verified_by: 'tinybench, Node 24.21.0, interleaved with b96f21c three times (table in Notes)'
  - text: 'Results built by Fence.run and by the public constructor are still frozen, with frozen entries, and the constructor still rejects malformed outcomes'
    satisfied: true
    evidence: 'test/result.test.ts'
    verified_by: 'vitest: 146 tests, including the frozen-view and storage tests'
  - text: 'The README performance table states numbers measured on the release candidate'
    satisfied: true
    evidence: 'README.md'
    verified_by: 'npm run bench on Node 24.21.0, 2026-09-19'
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0021 — Fence.run is 2.4-3.3x slower since the first review round

## Description

Measured 2026-09-19 on Node 24.21.0, interleaved: b96f21c runs the policy case at about 79,500 ops/s and strict equality at about 661,000; the current code at about 33,000 and 199,000, with Joi unchanged. A CPU profile attributes 59% of self time to freezeOutcomes: the Result constructor re-validates and re-freezes outcomes that Fence.run has already validated and frozen.

## Notes

- 2026-09-19: created
- 2026-09-19: fixed in two steps. `Fence.run` builds results through an internal trusted path
  instead of the validating public constructor; then `Result` keeps its entries in a private field
  and freezes the public `outcomes` view once, on first access (a CPU profile showed the
  per-entry `Object.freeze` was the whole remaining gap). Interleaved on Node 24.21.0, ops/s:

  | Code                    | user policy | strict equality |
  | ----------------------- | ----------- | --------------- |
  | b96f21c (first rewrite) | ~79,700     | ~670,000        |
  | before the fix          | ~33,000     | ~199,000        |
  | after the fix           | ~135,500    | ~1,906,000      |

  `run()` + `passed` on one step: 252 ns before, 22 ns after.
