---
id: FJ-0027
title: 'Automate releases from trunk: release candidates promoted when every check passes'
type: task
status: done
priority: p0
milestone: null
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: [FJ-0026]
acceptance_criteria:
  - text: 'A push to main whose commits warrant a release is tagged vX.Y.Z-rc.N before its checks run, where X.Y.Z comes from the commits since the last release and N increments with each candidate for X.Y.Z; a push that warrants none is not tagged'
    satisfied: true
    evidence: 'test/toolchain/release.test.ts'
    verified_by: 'release.test.ts candidate tests (real semantic-release, local bare remote); npm run release:dry-run on this repository names no release after v2.0.2'
  - text: 'When every check passes, the candidate is promoted with no human step: vX.Y.Z is tagged on the same commit, the tarball the checks verified is published to npm under latest with provenance, and a GitHub release carries the generated notes'
    satisfied: true
    evidence: 'tools/release/release.ts'
    verified_by: 'release.test.ts promotion test (tag on the candidate commit); a clean export stamped 2.0.3 passes npm run check, packs fence.js-2.0.3.tgz, and verify accepts it and refuses 2.0.4; npx semantic-release loads every plugin from release.config.mjs. On GitHub and npm: FJ-0028'
  - text: 'A failed check leaves only the candidate tag; a failed publish leaves no release tag, so a re-run promotes the same version; a publish that already happened is not repeated'
    satisfied: true
    evidence: 'test/toolchain/release.test.ts'
    verified_by: 'release.test.ts: a failed prepare leaves no release tag and the retry promotes; publish() leaves a version npm has with the same integrity and refuses different bytes'
  - text: 'The pipeline is the only automated actor that tags or publishes, and it commits nothing to main (no bypass of its protection); the tag ruleset that would enforce the first part is recommended to the owner'
    satisfied: true
    evidence: '.github/workflows/release.yml'
    verified_by: 'release.yml pushes only tags (candidate job) and release tags (semantic-release); the reviewer confirmed nothing pushes to main. No tag ruleset exists yet: recommended to the owner (release-process.md)'
  - text: 'The decision, the release process, the contributor guide, the agent instructions and the tracker describe the new flow; release-it, the release skill and the hand-written changelog step are gone'
    satisfied: true
    evidence: 'docs/adr/ADR-0013-trunk-based-continuous-release-conventional-commits-semantic.md'
    verified_by: 'npm run gates: PASS; git grep finds no release-it, npm run release, /release skill or tag-triggered publishing outside history'
links:
  code:
    [
      release.config.mjs,
      tools/release/release.ts,
      .github/workflows/release.yml,
      .github/workflows/checks.yml,
      .github/workflows/ci.yml,
    ]
  docs: [docs/toolchain/release-process.md]
  tests: [test/toolchain/release.test.ts]
  adrs: [ADR-0013]
---

# FJ-0027 — Automate releases from trunk: release candidates promoted when every check passes

## Description

The owner directed trunk-based development with a fully automated release. Every push to `main`
that warrants a release is tagged as the next release candidate. When every check passes, it is
promoted: tagged as the release, published to npm and announced as a GitHub release.
semantic-release decides the version from the commits and writes the notes (ADR-0013). This
replaces the hand-cut release commit, the hand-pushed tag and the hand-written changelog section
(ADR-0008).

## Notes

- 2026-09-19: created, with its criteria, before the work.
- 2026-09-19: spike, semantic-release 25.0.9 against a local bare remote:
  - After a `fix:`, the next version is 1.0.1, and it stays 1.0.1 with `v1.0.1-rc.1` and
    `v1.0.1-rc.2` tagged. A release branch ignores prerelease tags when it looks for the last
    release.
  - A `feat:` moves it to 1.1.0.
  - A publish step that runs in `prepare` and fails leaves no `v1.1.0` tag, and a retry promotes
    1.1.0 onto the candidate's commit.
  - A `docs:` push yields no release.
- 2026-09-19: review (fence-reviewer) of d6facd8. No blocker. It confirmed:
  - semantic-release 25.0.9 runs prepare, then tag and push, then publish, and a failed prepare
    creates no tag;
  - the tag-push authentication in both jobs works, and `@semantic-release/github` accepts the
    Actions token;
  - `dist.integrity` is the sha512 of the tarball bytes;
  - packing is byte-identical across builds and across Node 24.21 and 26.9.

  Applied from its findings:
  - The concurrency group is keyed by branch, so a manual run elsewhere cannot displace a
    waiting run on `main`.
  - Pages deploys after the promotion.
  - A manual runbook for partial promotions replaces a claimed automatic recovery. A rebuilt
    tarball differs, so npm refuses it.
  - The git calls use the environment passed in, so a global `tag.gpgSign` no longer breaks
    the tests.
  - `release:dry-run` on a branch says only `main` releases.
  - The deprecated GitHub plugin options are replaced.
  - The docs name the Dependabot bypass and recommend a tag ruleset and an `npm` environment
    policy.

  Live verification is FJ-0028.
