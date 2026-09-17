---
id: FJ-0007
title: "Remove the 1.x compatibility surface"
type: task
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
  - text: "No deprecated alias, default export or v1 importer remains in src or in the declarations"
    satisfied: true
    evidence: src/index.ts
    verified_by: "grep of src/ for fork|hydrate(|forAll|forAny|forOne|fromLegacyJSON is empty except HydrationError"
  - text: "MIGRATING gives a replacement for each removed name and a conversion snippet for 1.x serialized data"
    satisfied: true
    evidence: MIGRATING.md
    verified_by: human
  - text: "CHANGELOG lists the removals under Removed"
    satisfied: true
    evidence: CHANGELOG.md
    verified_by: "changelog gate"
links:
  code: [src/builder.ts, src/result.ts, src/serialize.ts, src/index.ts]
  docs: [MIGRATING.md, CHANGELOG.md]
  tests: [test/builder.test.ts, test/serialize.test.ts]
  adrs: [ADR-0005]
---

# FJ-0007 — Remove the 1.x compatibility surface

## Description

The owner directed that backward compatibility is not necessary and that deprecated functions, APIs and residual content be removed. Implements ADR-0005.

## Notes

- 2026-09-16: done (commit "Remove the 1.x compatibility surface"); 131 tests remain, coverage 99.7%.
