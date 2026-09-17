---
id: FJ-0010
title: "Publish 2.0.0: push master and the tag; enable npm trusted publishing"
type: task
status: ready
priority: p0
milestone: "2.0.0"
created: 2026-09-16
updated: 2026-09-16
parent: FJ-0001
blocks: []
blocked_by: []
owner: Tim Carlson
acceptance_criteria:
  - text: "npm trusted publishing is configured on npmjs.com for dotcarls/fence.js and .github/workflows/release.yml"
    satisfied: false
    evidence: null
    verified_by: human
  - text: "git push origin master --follow-tags succeeds and the Release workflow publishes 2.0.0 under latest with provenance"
    satisfied: false
    evidence: null
    verified_by: "human: workflow run and npm view fence.js"
  - text: "GitHub Pages serves the TypeDoc site from the docs workflow"
    satisfied: false
    evidence: null
    verified_by: human
links:
  code: [.github/workflows/release.yml, .github/workflows/docs.yml]
  docs: [docs/toolchain/release-process.md]
  tests: []
  adrs: [ADR-0008]
---

# FJ-0010 — Publish 2.0.0: push master and the tag; enable npm trusted publishing

## Description

The owner-only half of the release: agents never push or publish. Blocked in practice on FJ-0009 being tagged; recorded as ready because the setup step (trusted publishing) can happen first.

## Notes

- 2026-09-16: created.
