---
id: ADR-0010
title: 'One reusable check workflow gates Pages deployment and npm publishing; main is the default branch'
status: accepted
date: 2026-09-19
deciders:
  - Tim Carlson
  - Claude (Opus 5)
tags: [ci, release, pages, process]
supersedes: null
superseded_by: null
related:
  - docs/toolchain/release-process.md
  - .github/workflows/checks.yml
---

# ADR-0010 — One reusable check workflow gates Pages deployment and npm publishing; main is the default branch

## Context

Three workflows ran independently. `Docs` built and deployed Pages on every push to `master`
whether or not `CI` passed; `Release` ran on a tag with its own single-leg check and would have
published regardless of the CI matrix or CodeQL. The owner's requirement: **deployment and
publishing happen only after all CI jobs pass.** Two further findings: Pages was still in legacy
mode serving the `master` branch root, so the `Docs` deployment was never what the site showed;
and the owner asked to rename the default branch from `master` to `main`.

## Options considered

| Option                                                                                                                                                                                                    | Pros                                                                                                                                                 | Cons                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A reusable `checks.yml` (`on: workflow_call`) holding every check; `ci.yml` calls it and deploys Pages in a job that `needs` it; `release.yml` calls it on the tag and publishes in a job that `needs` it | GitHub enforces the ordering; the publish job stays in `release.yml`, which npm trusted publishing is configured for; one definition of "the checks" | Checks run again for the tag (the tagged commit is re-verified, which is the point)                                                                           |
| `workflow_run` triggers after `CI` completes                                                                                                                                                              | No duplication                                                                                                                                       | Runs in the default branch's context: `GITHUB_SHA` is not the tagged commit, so provenance would attest the wrong source; conclusions must be checked by hand |
| Branch protection with required checks only                                                                                                                                                               | Blocks bad merges                                                                                                                                    | Does nothing for a tag push or for a deploy triggered by a push                                                                                               |

## Decision

The first option:

- **`checks.yml`** is the only definition of the checks: `npm run check` on the pinned Node and
  on the other supported lines (ADR-0009), the `consume` job (the packed tarball installed by
  name and imported as ESM and CommonJS on Node 20.19.0 and 22.12.0, the floors `engines`
  admits), and CodeQL. On request it uploads the API reference the primary leg built as the
  Pages artifact.
- **`ci.yml`** runs `checks.yml` on pushes to `main`, pull requests, weekly and on demand. Its
  `pages` job `needs` the checks, runs only for a push to `main`, and deploys the artifact the
  checks built, so what is deployed is what was verified. Pages builds from GitHub Actions.
- **`release.yml`** runs `checks.yml` on the tag; its `publish` job `needs` them, refuses a tag
  that does not match `package.json` or is not on `main`, publishes with provenance under
  `latest` (or `next` for a prerelease) and creates the GitHub release from the changelog
  section (`scripts/changelog.mjs notes`).
- Actions are pinned by commit SHA with the version in a comment; Dependabot updates them
  weekly. Checkouts do not persist credentials; the publish job restores no cache.
- **`main` is the default branch.** Workflows, `.release-it.json`, the documents and the
  repository settings name `main`.

## Consequences

A failing check on any Node line, the consume job or CodeQL stops both deployment and
publication. A release runs the checks twice for the same commit (on `main`, then on the tag),
which costs minutes and guarantees the tag's own verification. Adding a check means adding it
to `checks.yml` (or to `npm run check`), never to a caller.

## Verification

`actionlint` reports no findings. The first push of `main` after this change must show the
`pages` job waiting on the checks, and the first tag must show `publish` waiting on its checks
(FJ-0019).

## Links

FJ-0015 · FJ-0017 · ADR-0008 · ADR-0009 · [release-process](../toolchain/release-process.md)

## Amendment A1 — 2026-09-19: the tested lines

The `check` and `consume` jobs run on the Active LTS pinned in `mise.toml` and on the upcoming
LTS, both installed with mise; the `consume` job no longer tests Node 20.19.0 and 22.12.0
([ADR-0011](ADR-0011-mise-manages-the-toolchain-the-active-lts-node-is-the-defaul.md)).

## Amendment A2 — 2026-09-19: one verified tarball, CodeQL as a gate

- A `pack` job in `checks.yml` builds and packs the tarball once; the `consume` jobs install that
  artifact, and `release.yml` publishes that same file (`npm publish <tarball>`), so what is
  published is what was verified. The publish job no longer installs dependencies, and mise gives
  it no GitHub token.
- The `codeql` job fails on any finding, so an alert stops deployment and publishing like a
  failed test instead of only being uploaded.
- `ci.yml`'s concurrency group includes the event name, so a scheduled or manual run can no
  longer cancel a pending push run and skip its Pages deployment.
