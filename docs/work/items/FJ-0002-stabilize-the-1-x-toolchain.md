---
id: FJ-0002
title: "Stabilize the 1.x toolchain on the v1 branch"
type: story
status: done
priority: p1
milestone: "1.0.2"
created: 2026-09-16
updated: 2026-09-16
parent: null
blocks: []
blocked_by: []
owner: agent
acceptance_criteria:
  - text: "The end-to-end sanity suite runs again (faker replaced) and every test passes"
    satisfied: true
    evidence: docs/design/2026-09-16-v2-proposal.md
    verified_by: "62 tests passing on branch v1 (jest), recorded in the design record appendix A"
  - text: "The lint script covers src/lib, tests and examples"
    satisfied: true
    evidence: docs/design/2026-09-16-v2-proposal.md
    verified_by: "npm run lint on branch v1"
  - text: "Travis is replaced by a GitHub Actions matrix"
    satisfied: true
    evidence: docs/design/2026-09-16-v2-proposal.md
    verified_by: "human: .github/workflows/ci.yml exists on branch v1"
links:
  code: []
  docs: [docs/design/2026-09-16-v2-proposal.md]
  tests: []
  adrs: []
---

# FJ-0002 — Stabilize the 1.x toolchain on the v1 branch

## Description

Phase 0 of the plan: make the 1.x tree trustworthy before rewriting it, so a 1.0.2 maintenance release is possible. Lives on the `v1` branch (commit "Stabilize the v1 toolchain"); nothing here is on `master`. Whether to release 1.0.2 is FJ-0013.

## Notes

- 2026-09-16: done on branch `v1`. The benchmark it repaired showed 1.x slower than validate.js and Joi on the policy case under Babel/ES5 output.
