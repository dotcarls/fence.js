---
id: FJ-0003
title: 'Replace the build, test and lint toolchain; port to TypeScript'
type: story
status: done
priority: p0
milestone: '2.0.0'
created: 2026-09-16
updated: 2026-09-16
parent: FJ-0001
blocks: []
blocked_by: []
owner: agent
acceptance_criteria:
  - text: 'TypeScript 6.0 strict configuration compiles src to an ESM dist with declarations'
    satisfied: true
    evidence: tsconfig.build.json
    verified_by: 'npm run build; publint; attw'
  - text: 'Vitest with 95% coverage thresholds and typecheck mode replaces Jest'
    satisfied: true
    evidence: vitest.config.ts
    verified_by: 'npm run test:coverage'
  - text: 'ESLint 10 flat config with typescript-eslint strict type-checked rules and Prettier run on staged files'
    satisfied: true
    evidence: eslint.config.js
    verified_by: 'npm run lint; pre-commit hook'
  - text: 'GitHub Actions runs the chain on Node 22, 24 and 26 and imports the built package on Node 20'
    satisfied: true
    evidence: .github/workflows/ci.yml
    verified_by: 'human: workflow read'
links:
  code: [tsconfig.json, package.json]
  docs: [docs/toolchain/environment.md]
  tests: []
  adrs: [ADR-0004]
---

# FJ-0003 — Replace the build, test and lint toolchain; port to TypeScript

## Description

Phase 1: swap every tool while keeping behavior identical, so the toolchain change can be reviewed apart from the rewrite. Dev dependencies went from 1,619 packages to 467 and audit findings from 111 to 2 (both dev-only, in the comparison libraries).

## Notes

- 2026-09-16: done (commit "Replace the build, test and lint toolchain; port v1 to TypeScript").
