---
id: FJ-0001
title: "fence.js 2.0: the TypeScript rewrite"
type: epic
status: done
priority: p0
milestone: "2.0.0"
created: 2026-09-16
updated: 2026-09-16
parent: null
blocks: []
blocked_by: []
owner: agent
acceptance_criteria:
  - text: "Every defect C1–C12 of the 1.x assessment is fixed by construction and has a regression test"
    satisfied: true
    evidence: docs/adr/ADR-0001-immutable-registry-builder-with-inferred-types.md
    verified_by: "test/builder.test.ts, test/fence.test.ts, test/result.test.ts, test/serialize.test.ts"
  - text: "The fluent API is typed from the registered validators"
    satisfied: true
    evidence: test/types.test-d.ts
    verified_by: "vitest typecheck mode"
  - text: "The package is ESM only with browser support, Node >= 20.19"
    satisfied: true
    evidence: docs/adr/ADR-0002-esm-only-distribution.md
    verified_by: "npm run check:package; CI consume job"
  - text: "npm run check is green with coverage >= 95% on every metric"
    satisfied: true
    evidence: .github/workflows/ci.yml
    verified_by: "npm run check (99.7% statements)"
links:
  code: [src/index.ts]
  docs: [docs/design/2026-09-16-v2-proposal.md, docs/architecture/overview.md]
  tests: [test/types.test-d.ts]
  adrs: [ADR-0001, ADR-0002, ADR-0003, ADR-0004]
---

# FJ-0001 — fence.js 2.0: the TypeScript rewrite

## Description

The modernization the owner approved on 2026-09-16 from the [design record](../../design/2026-09-16-v2-proposal.md): assess 1.x, replace the toolchain, rewrite the core as an immutable typed builder with a new serialization format, review it adversarially, document it, and release 2.0.0. Children: FJ-0003 to FJ-0009.

## Notes

- 2026-09-16: created and completed in one day across six commits on the `v2` branch; see the children for evidence.
