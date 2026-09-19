---
id: FJ-0026
title: 'Enforce Conventional Commits on every commit'
type: task
status: done
priority: p0
milestone: null
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: [FJ-0027]
blocked_by: []
acceptance_criteria:
  - text: 'A commit whose message is not a Conventional Commit is refused locally by the commit-msg hook, and a conforming one is accepted'
    satisfied: true
    evidence: 'package.json'
    verified_by: 'commit-msg hook: a real git commit with message "Update things" was refused (2 problems) and HEAD did not move; d6facd8 was accepted'
  - text: 'CI fails a pull request whose commits or title do not conform (a squash merge uses the title), and fails the run on main of a push whose added commits do not conform, without blocking later pushes'
    satisfied: true
    evidence: '.github/workflows/checks.yml'
    verified_by: "actionlint 1.7.12; the job's shell step run locally: 3d71f28..d6facd8 passes, an all-zeros before checks HEAD only and passes, 556e3ea..d6facd8 (includes 3d71f28) fails. On GitHub: FJ-0028"
  - text: 'Dependabot writes conforming messages: fix(deps) for runtime dependencies, build(deps-dev) for development ones, ci(deps) for actions'
    satisfied: true
    evidence: '.github/dependabot.yml'
    verified_by: 'dependabot.yml prefixes fix / build (development) / ci with scope; release.test.ts: build(deps-dev) and ci(deps) release nothing, fix(deps) a patch'
  - text: 'Contributors and agents are told the convention and which types release what'
    satisfied: true
    evidence: 'CONTRIBUTING.md'
    verified_by: 'CONTRIBUTING.md Commit messages; CLAUDE.md standing rule; release-process.md; fence-implementer.md'
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
- 2026-09-19: done in d6facd8, with the review applied in the following commit:
  - Pull request ranges no longer require the base to be an ancestor.
  - Dependabot's prefixes are what it actually writes.
  - The docs say which pushes the run on `main` can miss: a push replaced while waiting, and a
    manual run.

  Live behavior on GitHub is FJ-0028.
