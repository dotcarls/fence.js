---
id: FJ-0027
title: 'Automate releases from trunk: release candidates promoted when every check passes'
type: task
status: in-progress
priority: p0
milestone: null
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: [FJ-0026]
acceptance_criteria:
  - text: 'A push to main whose commits warrant a release is tagged vX.Y.Z-rc.N before its checks run, where X.Y.Z comes from the commits since the last release and N increments with each candidate for X.Y.Z; a push that warrants none is not tagged'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'When every check passes, the candidate is promoted with no human step: vX.Y.Z is tagged on the same commit, the tarball the checks verified is published to npm under latest with provenance, and a GitHub release carries the generated notes'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'A failed check leaves only the candidate tag; a failed publish leaves no release tag, so a re-run promotes the same version; a publish that already happened is not repeated'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Nothing but the pipeline tags or publishes, and the pipeline commits nothing to main (no bypass of its protection)'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'The decision, the release process, the contributor guide, the agent instructions and the tracker describe the new flow; release-it, the release skill and the hand-written changelog step are gone'
    satisfied: false
    evidence: null
    verified_by: null
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
