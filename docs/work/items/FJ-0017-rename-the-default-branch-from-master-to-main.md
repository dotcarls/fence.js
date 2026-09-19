---
id: FJ-0017
title: 'Rename the default branch from master to main'
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
  - text: 'The local and GitHub branches are named main and main is the default branch'
    satisfied: true
    evidence: 'docs/work/items/FJ-0017-rename-the-default-branch-from-master-to-main.md#notes'
    verified_by: 'gh api: default_branch main; branches/master/rename returned main'
  - text: 'Workflows, release configuration, documents and settings (Pages, environments) refer to main'
    satisfied: true
    evidence: 'docs/toolchain/release-process.md'
    verified_by: 'git grep: no current-state document names master'
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0017 — Rename the default branch from master to main

## Description

The owner asked to switch the repository's main branch from master to main.

## Notes

- 2026-09-19: created
- 2026-09-19: done with `gh api -X POST repos/dotcarls/fence.js/branches/master/rename` (GitHub
  moved the default branch and retargeted all 13 open PRs), Pages switched to Actions with its
  source on `main`, the `github-pages` environment policy moved from `master` to `main`, and the
  local branch renamed and tracking `origin/main`. Historical records keep the name `master`.
