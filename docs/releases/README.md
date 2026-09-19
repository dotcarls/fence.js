---
title: Releases
doc_type: index
status: living
---

# Releases

Release notes live in one curated file, [`CHANGELOG.md`](../../CHANGELOG.md), which ships in the
npm package. Its shape is Keep a Changelog: an `[Unreleased]` staging section, one
`## [x.y.z] - YYYY-MM-DD` section per version, the six categories
([taxonomy](../toolchain/taxonomy.md#changelog-categories)). The `changelog` gate checks the
shape and that the package version has its section.

How a version is cut: [release-process](../toolchain/release-process.md). How items bind to a
release: each work item names its `milestone`; a changelog entry that realizes an item cites its
id; the GitHub release notes are the version's changelog section.

| Version | Date       | Line | Notes                                                                        |
| ------- | ---------- | ---- | ---------------------------------------------------------------------------- |
| 2.0.1   | 2026-09-19 | main | First 2.x on npm: the 2.0.0 pipeline fixes ([CHANGELOG](../../CHANGELOG.md)) |
| 2.0.0   | 2026-09-16 | main | The TypeScript rewrite; tagged, never published (its pipeline failed)        |
| 1.0.1   | 2021-06-11 | v1   | Last 1.x release; the `v1` branch carries a stabilized toolchain             |
