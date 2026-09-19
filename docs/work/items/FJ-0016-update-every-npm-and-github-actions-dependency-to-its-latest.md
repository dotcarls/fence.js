---
id: FJ-0016
title: 'Update every npm and GitHub Actions dependency to its latest version'
type: task
status: done
priority: p1
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'Every devDependency is at its latest release, or at the latest release its peers allow, with the exception recorded'
    satisfied: true
    evidence: 'package.json'
    verified_by: 'npm outdated lists only typescript (6.0.3 wanted by the peers, 7.0.2 latest)'
  - text: 'The lockfile is regenerated so transitive dependencies are current'
    satisfied: true
    evidence: 'package-lock.json'
    verified_by: 'regenerated with npm 11.19.0; npm ci on npm 10.9.8 and 11.19.x'
  - text: 'Every action is at its latest release, pinned by commit SHA with the version in a comment'
    satisfied: true
    evidence: '.github/workflows/checks.yml'
    verified_by: 'gh api releases/latest for each action on 2026-09-19'
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0016 — Update every npm and GitHub Actions dependency to its latest version

## Description

The owner asked for all npm and Actions dependencies to be at their latest versions; Dependabot had opened four failing action-bump PRs.

## Notes

- 2026-09-19: created
- 2026-09-19: raised @types/node 22→26.6.2, eslint 10.11.0, prettier 3.9.8, release-it 21.1.0; added
  @eslint/compat 2.1.1; the rest were already latest. TypeScript held at 6.0.3 (ADR-0004 A1).
  Actions: checkout 7.0.1, setup-node 7.0.0, upload-pages-artifact 5.0.0, deploy-pages 5.0.1,
  codeql-action 4.38.1, all pinned by SHA. `npm audit`: one moderate finding, in validate.js
  (a dev-only comparison library with no fixed release).
- 2026-09-19: the four Dependabot action PRs (#263–#266) and nine obsolete 1.x npm PRs are
  superseded; Dependabot closes them on its next run against `main`.
