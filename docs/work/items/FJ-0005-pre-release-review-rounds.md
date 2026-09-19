---
id: FJ-0005
title: 'Pre-release review rounds'
type: task
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
  - text: 'A multi-lens review of the rewrite produced findings with evidence, and every major finding is fixed or recorded as a deliberate deviation'
    satisfied: true
    evidence: docs/design/2026-09-16-v2-proposal.md
    verified_by: 'human: 71 merged findings, 12 major; appendix B of the design record lists the accepted deviations'
  - text: 'A second independent round verified the fixes and found no regression'
    satisfied: true
    evidence: docs/design/2026-09-16-v2-proposal.md
    verified_by: 'human: two agents, one verifying all 71 findings, one reviewing cold; their three majors are fixed'
  - text: 'The shipped declarations compile under TypeScript 5.0, 5.4 and 5.9 with lib ES2020'
    satisfied: true
    evidence: README.md
    verified_by: 'tsc 5.0.4 / 5.4 / 5.9 --strict --lib es2020 on dist/*.d.ts with a consumer file'
links:
  code: []
  docs: [docs/design/2026-09-16-v2-proposal.md]
  tests: []
  adrs: []
---

# FJ-0005 — Pre-release review rounds

## Description

Two review rounds before release: a seven-lens review (proposal conformance, correctness, types, idioms, packaging, tests, docs) followed by a two-agent verification round after the owner asked for small agent pools. Fixes landed in the commits "Address the pre-release review findings" and "Apply the second review round".

## Notes

- 2026-09-16: done. The owner limited agent pools to 1–3 during this item; the rule is now in CLAUDE.md.
