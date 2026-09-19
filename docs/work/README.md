---
title: Work items index
doc_type: index
status: living
---

# Work items

One file per item under [`items/`](items/). Schema and rules: [work-tracking](../toolchain/work-tracking.md);
lifecycle: [sdlc](../toolchain/sdlc.md). Current state of play: [CHECKPOINT.md](CHECKPOINT.md).
Template: [TEMPLATE.md](TEMPLATE.md). Create with `npm run work -- new --title "..."`.

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: work-index -->
_28 items. Generated from front matter; run `npm run gates:fix`._

### ready (2)

| id | title | type | priority | milestone | parent |
|---|---|---|---|---|---|
| [FJ-0025](items/FJ-0025-publish-2-0-2-push-main-then-the-v2-0-2-tag-once-ci-on-main.md) | Publish 2.0.2: push main, then the v2.0.2 tag once CI on main is green | task | p0 | 2.0.2 | — |
| [FJ-0028](items/FJ-0028-verify-the-automated-release-on-github-first-push-first-pull.md) | Verify the automated release on GitHub: first push, first pull request, first promotion | task | p1 | — | — |

### backlog (3)

| id | title | type | priority | milestone | parent |
|---|---|---|---|---|---|
| [FJ-0011](items/FJ-0011-async-validators.md) | Async validators: runAsync and AsyncValidator | story | p2 | 2.1.0 | — |
| [FJ-0012](items/FJ-0012-verify-browser-consumption-from-an-esm-cdn.md) | Verify browser consumption from an ESM CDN | task | p2 | 2.x | — |
| [FJ-0013](items/FJ-0013-decide-the-1-x-maintenance-line.md) | Decide the 1.x maintenance line | decision | p3 | — | — |

### done (21)

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
| [FJ-0014](items/FJ-0014-check-targets-depend-on-build-output-and-local-state-so-lint.md) | Check targets depend on build output and local state, so lint fails in CI | bug | p0 | 2.0.1 | — |
| [FJ-0015](items/FJ-0015-deploy-docs-and-publish-to-npm-only-after-every-ci-job-passe.md) | Deploy docs and publish to npm only after every CI job passes | story | p0 | 2.0.1 | — |
| [FJ-0016](items/FJ-0016-update-every-npm-and-github-actions-dependency-to-its-latest.md) | Update every npm and GitHub Actions dependency to its latest version | task | p1 | 2.0.1 | — |
| [FJ-0017](items/FJ-0017-rename-the-default-branch-from-master-to-main.md) | Rename the default branch from master to main | task | p1 | 2.0.1 | — |
| [FJ-0018](items/FJ-0018-release-2-0-1.md) | Release 2.0.1 | release | p0 | 2.0.1 | — |
| [FJ-0020](items/FJ-0020-adopt-mise-for-the-toolchain-active-lts-node-by-default-upco.md) | Adopt mise for the toolchain; Active LTS Node by default, upcoming LTS the only other line tested | task | p0 | 2.0.1 | — |
| [FJ-0021](items/FJ-0021-fence-run-is-2-4-3-3x-slower-since-the-first-review-round.md) | Fence.run is 2.4-3.3x slower since the first review round | bug | p0 | 2.0.1 | — |
| [FJ-0022](items/FJ-0022-codeql-js-incomplete-sanitization-in-the-ontology-table-gene.md) | CodeQL js/incomplete-sanitization in the ontology table generator stops 2.0.1 | bug | p0 | 2.0.2 | — |
| [FJ-0023](items/FJ-0023-run-codeql-locally-with-the-same-cli-and-queries-as-ci.md) | Run CodeQL locally with the same CLI and queries as CI | task | p0 | 2.0.2 | — |
| [FJ-0024](items/FJ-0024-release-2-0-2.md) | Release 2.0.2 | release | p0 | 2.0.2 | — |
| [FJ-0026](items/FJ-0026-enforce-conventional-commits-on-every-commit.md) | Enforce Conventional Commits on every commit | task | p0 | — | — |
| [FJ-0027](items/FJ-0027-automate-releases-from-trunk-release-candidates-promoted-whe.md) | Automate releases from trunk: release candidates promoted when every check passes | task | p0 | — | — |

### cancelled (2)

| id | title | type | priority | milestone | parent |
|---|---|---|---|---|---|
| [FJ-0010](items/FJ-0010-publish-2-0-0.md) | Publish 2.0.0: push master and the tag; enable npm trusted publishing | task | p0 | 2.0.0 | FJ-0001 |
| [FJ-0019](items/FJ-0019-publish-2-0-1-push-main-and-the-v2-0-1-tag.md) | Publish 2.0.1: push main and the v2.0.1 tag | task | p0 | 2.0.1 | — |
<!-- END GENERATED: work-index -->
<!-- prettier-ignore-end -->
