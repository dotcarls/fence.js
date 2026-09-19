---
id: FJ-0025
title: 'Publish 2.0.2: push main, then the v2.0.2 tag once CI on main is green'
type: task
status: ready
priority: p0
milestone: '2.0.2'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: [FJ-0024]
owner: 'Tim Carlson'
acceptance_criteria:
  - text: 'git push origin main succeeds and CI on main is green, the CodeQL job included, and Pages deploys'
    satisfied: true
    evidence: 'docs/work/items/FJ-0025-publish-2-0-2-push-main-then-the-v2-0-2-tag-once-ci-on-main.md#notes'
    verified_by: 'gh run view 35456148222: CI on 3d71f28, every job succeeded'
  - text: 'The code-scanning alert for js/incomplete-sanitization at tools/gates/generate.ts is closed'
    satisfied: true
    evidence: 'docs/work/items/FJ-0025-publish-2-0-2-push-main-then-the-v2-0-2-tag-once-ci-on-main.md#notes'
    verified_by: 'gh api repos/dotcarls/fence.js/code-scanning/alerts: alert 7 state fixed'
  - text: 'git push origin v2.0.2, then the Release workflow publishes 2.0.2 under latest with provenance after its checks pass'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: [docs/toolchain/release-process.md]
  tests: []
  adrs: []
---

# FJ-0025 — Publish 2.0.2: push main, then the v2.0.2 tag once CI on main is green

## Description

The owner-only half of the 2.0.2 release: agents never push or publish. It replaces FJ-0019,
whose push ran and whose publish CodeQL stopped.

## Notes

- 2026-09-19: created. The tag is pushed only after CI on `main` passes on the release commit, so
  a failing check costs a push rather than a version number
  ([release-process](../../toolchain/release-process.md)).
- 2026-09-19: the owner pushed `main` and then `v2.0.2`. CI on `main` passed (run 35456148222), and
  code-scanning alert 7 is fixed. The Release run on `v2.0.2` (35456319225) passed every check,
  signed the provenance statement, and then npm refused the upload: `403 Forbidden - PUT
https://registry.npmjs.org/fence.js - OIDC permission denied for this action`.

  Cause, per npm's documentation (<https://docs.npmjs.com/trusted-publishers/>, retrieved
  2026-09-19): a trusted publisher configured after 2026-09-03 is allowed `npm stage publish`
  only, unless `npm publish` is also ticked under **Allowed actions**. This one was configured on
  2026-09-19. The pipeline was not at fault.

  Remaining, the owner's:
  1. On npmjs.com, fence.js, Settings, the trusted publisher (`release.yml`, environment `npm`):
     allow `npm publish`.
  2. Re-run the failed `publish` job of run 35456319225. It publishes the tarball its checks
     verified.

  Future releases are automated (FJ-0027, ADR-0013).
