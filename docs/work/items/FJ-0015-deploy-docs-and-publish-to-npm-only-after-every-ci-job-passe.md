---
id: FJ-0015
title: 'Deploy docs and publish to npm only after every CI job passes'
type: story
status: done
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'One reusable workflow holds every check (all Node legs, the consume job, CodeQL, the docs build)'
    satisfied: true
    evidence: '.github/workflows/checks.yml'
    verified_by: 'actionlint 1.7.12: no findings'
  - text: 'ci.yml is configured to deploy Pages only after that workflow succeeds on main, from the artifact the checks built (observed on GitHub in FJ-0019)'
    satisfied: true
    evidence: '.github/workflows/ci.yml'
    verified_by: 'actionlint; the pages job needs checks and deploys the artifact uploaded by the primary leg'
  - text: 'release.yml is configured to publish only after that workflow succeeds on the tagged commit, only for a tag on main that matches package.json, and only the tarball the checks verified (observed on GitHub in FJ-0019)'
    satisfied: true
    evidence: '.github/workflows/release.yml'
    verified_by: 'actionlint; the publish job needs checks, verifies version and ancestry of main'
  - text: 'actionlint reports no findings for the workflows'
    satisfied: true
    evidence: 'docs/adr/ADR-0010-one-reusable-check-workflow-gates-pages-deployment-and-npm-p.md#verification'
    verified_by: 'actionlint 1.7.12'
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0015 — Deploy docs and publish to npm only after every CI job passes

## Description

Docs deployed on every push to master regardless of CI, and the release workflow published on its own partial check. Deployment and publishing must follow a green CI.

## Notes

- 2026-09-19: created
- 2026-09-19: done. The first observed run of the new pipeline is FJ-0019's (the owner's push).
- 2026-09-19: Pages was in legacy mode serving the branch root; switched to GitHub Actions
  (`build_type: workflow`) and the `github-pages` environment now allows `main` only.
- 2026-09-19: the review found the criteria claimed runtime ordering that only a GitHub run can
  show; they now say what is configured, and FJ-0019 observes it. Also from the review (ADR-0010
  A2): a `pack` job produces the one tarball the consume jobs install and the release publishes;
  the `codeql` job fails on any finding; the concurrency group includes the event name so a
  scheduled run cannot cancel a pending push deploy; the publish job gets no GitHub token from
  mise and installs no dependencies.
