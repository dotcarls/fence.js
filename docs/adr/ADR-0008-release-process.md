---
id: ADR-0008
title: "Release process: semantic versioning, Keep a Changelog, a release commit and tag, tag-triggered trusted publishing"
status: accepted
date: "2026-09-16"
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [release, process, npm]
supersedes: null
superseded_by: null
related: []
---

# ADR-0008 — Release process: semantic versioning, Keep a Changelog, a release commit and tag, tag-triggered trusted publishing

## Context

1.x released with release-it publishing from a laptop with an npm token. 2.0 needed a
repeatable, reviewable path where nothing is published from a machine and prereleases cannot
become `latest` by accident.

## Options considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Local bump + changelog check + commit + annotated tag; GitHub Actions publishes on the tag with npm trusted publishing (OIDC) and provenance; prereleases go to `next` | No token anywhere; every publish traceable to a tag and a workflow run; the changelog is the release note | Trusted publishing must be configured once on npmjs.com |
| Publish from release-it locally | One command | Token on a laptop; no provenance |
| Changesets | Good for monorepos | Per-change files are more ceremony than a one-package repository needs |

## Decision

The first option, as written in [release-process](../toolchain/release-process.md):
semantic versioning by the change classes in the [taxonomy](../toolchain/taxonomy.md); a
hand-maintained Keep a Changelog `CHANGELOG.md` whose `[Unreleased]` section becomes
`## [x.y.z] - date` at release; `scripts/check-changelog.mjs` refuses a release without its
section; the `Release vx.y.z` commit and the annotated `vx.y.z` tag on `master`; the tag pushes
`.github/workflows/release.yml`, which runs the check chain, publishes with `--provenance`
under `latest` (or `next` for a prerelease) and creates the GitHub release from the changelog
section. Pushing and publishing are the owner's acts; agents stop at the tag.

## Consequences

Releases are auditable end to end; a beta cannot shadow the stable line. Cost: one-time npm
trusted publishing setup.

## Verification

`test`: the release workflow's tag/version check and section extraction were exercised locally
for `v2.0.0-beta.1` and `v2.0.0`; the `changelog` gate; `npm run check` in the workflow.

## Links

[releases](../releases/README.md) · FJ-0009 · FJ-0010
