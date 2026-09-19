---
id: FJ-0014
title: 'Check targets depend on build output and local state, so lint fails in CI'
type: bug
status: in-progress
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'eslint, typecheck and every other npm target give the same result in a fresh clone with no dist/ as in a working tree with a stale dist/'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Targets that need a build build it themselves from a clean dist/'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Every tool ignores exactly what git ignores, and the gate walker lists files through git'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'The toolchain Node version is pinned (.nvmrc) and enforced (devEngines) for installs and runs'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Randomized tests use a fixed seed so a run is reproducible'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0014 — Check targets depend on build output and local state, so lint fails in CI

## Description

The 2.0.0 tag and the master push failed CI at eslint: the examples import fence.js by name, which resolved to dist/index.d.ts; locally dist/ existed from an earlier build, in CI lint ran before build. Every target must behave identically locally and in CI.

## Notes

- 2026-09-19: created
