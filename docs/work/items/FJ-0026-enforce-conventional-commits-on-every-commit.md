---
id: FJ-0026
title: 'Enforce Conventional Commits on every commit'
type: task
status: in-progress
priority: p0
milestone: null
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: [FJ-0027]
blocked_by: []
acceptance_criteria:
  - text: 'A commit whose message is not a Conventional Commit is refused locally by the commit-msg hook, and a conforming one is accepted'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'CI fails a pull request whose commits or title do not conform (a squash merge uses the title), and fails the pipeline run of a push to main whose pushed commits do not conform, without blocking later pushes'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Dependabot writes conforming messages: build(deps) for npm, ci(deps) for actions'
    satisfied: false
    evidence: null
    verified_by: null
  - text: 'Contributors and agents are told the convention and which types release what'
    satisfied: false
    evidence: null
    verified_by: null
links:
  code: [commitlint.config.mjs, package.json, .github/workflows/checks.yml, .github/dependabot.yml]
  docs: [CONTRIBUTING.md, docs/toolchain/release-process.md]
  tests: []
  adrs: [ADR-0013]
---

# FJ-0026 — Enforce Conventional Commits on every commit

## Description

The owner directed that every commit follow the
[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/#specification)
specification: the release tooling derives the version and the release notes from commit messages
(ADR-0013). `main` is protected by a ruleset that only maintainers bypass, so a commit reaches it
through a maintainer's push or a merged pull request; both paths are checked.

## Notes

- 2026-09-19: created, with its criteria, before the work.
