---
title: Work items index
doc_type: index
status: living
---

# Work items

One file per item under [`items/`](items/). Schema and rules: [work-tracking](../toolchain/work-tracking.md);
lifecycle: [sdlc](../toolchain/sdlc.md). Current state of play: [CHECKPOINT.md](CHECKPOINT.md).
Template: [TEMPLATE.md](TEMPLATE.md). Create with `npm run work -- new --title "..."`.

<!-- BEGIN GENERATED: work-index -->
_13 items. Generated from front matter; run `npm run gates:fix`._

### ready (1)

| id | title | type | priority | milestone | parent |
|---|---|---|---|---|---|
| [FJ-0010](items/FJ-0010-publish-2-0-0.md) | Publish 2.0.0: push master and the tag; enable npm trusted publishing | task | p0 | 2.0.0 | FJ-0001 |

### backlog (3)

| id | title | type | priority | milestone | parent |
|---|---|---|---|---|---|
| [FJ-0011](items/FJ-0011-async-validators.md) | Async validators: runAsync and AsyncValidator | story | p2 | 2.1.0 | — |
| [FJ-0012](items/FJ-0012-verify-browser-consumption-from-an-esm-cdn.md) | Verify browser consumption from an ESM CDN | task | p2 | 2.x | — |
| [FJ-0013](items/FJ-0013-decide-the-1-x-maintenance-line.md) | Decide the 1.x maintenance line | decision | p3 | — | — |

### done (9)

| id | title | type | priority | milestone | parent |
|---|---|---|---|---|---|
| [FJ-0001](items/FJ-0001-fence-js-2-0-typescript-rewrite.md) | fence.js 2.0: the TypeScript rewrite | epic | p0 | 2.0.0 | — |
| [FJ-0002](items/FJ-0002-stabilize-the-1-x-toolchain.md) | Stabilize the 1.x toolchain on the v1 branch | story | p1 | 1.0.2 | — |
| [FJ-0003](items/FJ-0003-replace-the-toolchain-and-port-to-typescript.md) | Replace the build, test and lint toolchain; port to TypeScript | story | p0 | 2.0.0 | FJ-0001 |
| [FJ-0004](items/FJ-0004-rewrite-the-core-and-serialization-format-2.md) | Rewrite the core as an immutable typed builder; serialization format 2 | story | p0 | 2.0.0 | FJ-0001 |
| [FJ-0005](items/FJ-0005-pre-release-review-rounds.md) | Pre-release review rounds | task | p0 | 2.0.0 | FJ-0001 |
| [FJ-0006](items/FJ-0006-readme-migration-guide-and-changelog.md) | README, migration guide and changelog for 2.0 | task | p0 | 2.0.0 | FJ-0001 |
| [FJ-0007](items/FJ-0007-remove-the-1-x-compatibility-surface.md) | Remove the 1.x compatibility surface | task | p0 | 2.0.0 | FJ-0001 |
| [FJ-0008](items/FJ-0008-agentic-toolchain-and-governance-scaffold.md) | Agentic toolchain and SDLC governance scaffold | story | p0 | 2.0.0 | FJ-0001 |
| [FJ-0009](items/FJ-0009-release-2-0-0.md) | Release 2.0.0 | release | p0 | 2.0.0 | FJ-0001 |
<!-- END GENERATED: work-index -->
