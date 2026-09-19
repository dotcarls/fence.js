---
title: Architecture Decision Records
doc_type: index
status: living
---

# Architecture Decision Records

Format and process: [ADR-0000](ADR-0000-adr-process.md). Template: [TEMPLATE.md](TEMPLATE.md).
Create with `npm run adr -- new --title "..."`. A record is `proposed` until the owner accepts it.

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: adr-index -->
_11 decision records. Generated from front matter; run `npm run gates:fix`._

| id | title | status | date | tags |
|---|---|---|---|---|
| [ADR-0000](ADR-0000-adr-process.md) | ADR format and process | accepted | 2026-09-16 | process, toolchain |
| [ADR-0001](ADR-0001-immutable-registry-builder-with-inferred-types.md) | v2 core: an immutable registry-based builder with fluent methods typed from the validators | accepted | 2026-09-16 | core, api, types, immutability |
| [ADR-0002](ADR-0002-esm-only-distribution.md) | ESM-only distribution with browser support; Node 20.19 or newer | accepted | 2026-09-16 | distribution, packaging, browser |
| [ADR-0003](ADR-0003-serialization-format-2.md) | Serialization format 2: one JSON document with tagged nested fences, validated on the way in | accepted | 2026-09-16 | serialization, format, compatibility |
| [ADR-0004](ADR-0004-typescript-toolchain.md) | Toolchain: TypeScript 6.0 pinned, tsc build, Vitest, ESLint flat config, Prettier | accepted | 2026-09-16 | toolchain, typescript, testing, lint |
| [ADR-0005](ADR-0005-no-compatibility-surface-in-2-0.md) | 2.0 ships no 1.x compatibility surface | accepted | 2026-09-16 | api, compatibility, semver |
| [ADR-0006](ADR-0006-agentic-toolchain-and-sdlc.md) | The documentation graph, work tracking, gates, checkpoint and the agent commit policy | accepted | 2026-09-16 | process, toolchain, governance, sdlc |
| [ADR-0007](ADR-0007-vocabulary-governance.md) | Vocabulary governance: metamodel, ontology, taxonomy and lexicon as data | accepted | 2026-09-16 | governance, vocabulary, ontology |
| [ADR-0008](ADR-0008-release-process.md) | Release process: semantic versioning, Keep a Changelog, a release commit and tag, tag-triggered trusted publishing | accepted | 2026-09-16 | release, process, npm |
| [ADR-0009](ADR-0009-hermetic-targets-every-check-depends-only-on-the-tracked-tre.md) | Hermetic targets: every check depends only on the tracked tree and the pinned toolchain | accepted | 2026-09-19 | toolchain, ci, reproducibility |
| [ADR-0010](ADR-0010-one-reusable-check-workflow-gates-pages-deployment-and-npm-p.md) | One reusable check workflow gates Pages deployment and npm publishing; main is the default branch | accepted | 2026-09-19 | ci, release, pages, process |
<!-- END GENERATED: adr-index -->
<!-- prettier-ignore-end -->
