---
title: Releases
doc_type: index
status: living
---

# Releases

From 2.0.3 on, the pipeline releases from `main` with no human step, and the notes are
generated from the Conventional Commits each release contains: they are the
[GitHub releases](https://github.com/dotcarls/fence.js/releases), and the tags are `vX.Y.Z`
(with `vX.Y.Z-rc.N` for each candidate before it)
([release-process](../toolchain/release-process.md)). A commit that realizes a work item names
it (`fix: … (FJ-0042)`), so the notes link back to the tracker.

[`CHANGELOG.md`](../../CHANGELOG.md) is the hand-written record of 2.0.2 and earlier, in Keep a
Changelog form ([taxonomy](../toolchain/taxonomy.md#changelog-categories)); the `changelog` gate
keeps its shape and refuses new `[Unreleased]` entries.

| Version | Date       | Line | Notes                                                                                          |
| ------- | ---------- | ---- | ---------------------------------------------------------------------------------------------- |
| 2.0.2   | 2026-09-19 | main | CodeQL fix; tagged, not yet published (npm refused: FJ-0025) ([CHANGELOG](../../CHANGELOG.md)) |
| 2.0.1   | 2026-09-19 | main | The 2.0.0 pipeline fixes; tagged, never published (CodeQL failed its pipeline)                 |
| 2.0.0   | 2026-09-16 | main | The TypeScript rewrite; tagged, never published (its pipeline failed)                          |
| 1.0.1   | 2021-06-11 | v1   | Last 1.x release; the `v1` branch carries a stabilized toolchain                               |
