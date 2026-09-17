---
id: FJ-0004
title: "Rewrite the core as an immutable typed builder; serialization format 2"
type: story
status: done
priority: p0
milestone: "2.0.0"
created: 2026-09-16
updated: 2026-09-16
parent: FJ-0001
blocks: []
blocked_by: []
owner: agent
acceptance_criteria:
  - text: "register, registerAll, step and the fluent methods return new builders; the prototype chain is flat; registrations do not leak"
    satisfied: true
    evidence: test/builder.test.ts
    verified_by: "vitest"
  - text: "Memoization caches false, keys by SameValueZero or identity, and belongs to the built fence"
    satisfied: true
    evidence: test/fence.test.ts
    verified_by: "vitest"
  - text: "Result folds nested arrays and records, reports failure paths, explains as text and serializes JSON-safely"
    satisfied: true
    evidence: test/result.test.ts
    verified_by: "vitest"
  - text: "toJSON produces one validated JSON document with tagged nested fences; fromJSON validates everything and lists every missing name"
    satisfied: true
    evidence: test/serialize.test.ts
    verified_by: "vitest, including two fast-check properties"
  - text: "Reserved, duplicate and union names are self-explaining compile errors; dynamic names widen the registry"
    satisfied: true
    evidence: test/types.test-d.ts
    verified_by: "vitest typecheck mode"
links:
  code: [src/builder.ts, src/fence.ts, src/result.ts, src/step.ts, src/serialize.ts, src/types.ts]
  docs: [docs/architecture/overview.md]
  tests: [test/builder.test.ts, test/fence.test.ts, test/result.test.ts, test/serialize.test.ts, test/types.test-d.ts]
  adrs: [ADR-0001, ADR-0003]
---

# FJ-0004 — Rewrite the core as an immutable typed builder; serialization format 2

## Description

Phases 2 and 3 of the plan, landed together because they share code. Implements ADR-0001 and ADR-0003.

## Notes

- 2026-09-16: done (commit "Rewrite the core as an immutable, typed builder; serialization format v2"), then hardened by FJ-0005.
