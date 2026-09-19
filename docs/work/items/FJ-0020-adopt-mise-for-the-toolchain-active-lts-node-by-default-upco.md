---
id: FJ-0020
title: 'Adopt mise for the toolchain; Active LTS Node by default, upcoming LTS the only other line tested'
type: task
status: done
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'mise.toml is the single toolchain pin (Node 24.21.0, the current Active LTS) and replaces .nvmrc'
    satisfied: true
    evidence: 'mise.toml'
    verified_by: 'mise exec -- node --version: v24.21.0; .nvmrc removed'
  - text: 'CI installs the toolchain with mise and tests only the Active LTS and the upcoming LTS (Node 26)'
    satisfied: true
    evidence: '.github/workflows/checks.yml'
    verified_by: 'actionlint; both legs run through jdx/mise-action; MISE_NODE_VERSION=26.9.0 verified locally'
  - text: 'The package engines and devEngines match the lines that are tested'
    satisfied: true
    evidence: 'package.json'
    verified_by: 'engines ^24.0.0 || >=26.0.0 and devEngines ^24.15.0 || >=26.0.0 match the tested lines'
  - text: 'The hooks, documents and decision records describe mise and the LTS policy'
    satisfied: true
    evidence: 'docs/adr/ADR-0011-mise-manages-the-toolchain-the-active-lts-node-is-the-defaul.md'
    verified_by: 'gates (xref, schemas, reachability); git grep finds no current-state .nvmrc reference'
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0020 — Adopt mise for the toolchain; Active LTS Node by default, upcoming LTS the only other line tested

## Description

The owner directed: use mise by default; the current LTS version of node is the default version, and the only other version(s) tested are upcoming LTS release(s). On 2026-09-19 the Active LTS is Node 24 (maintenance from 2026-10-20) and the upcoming LTS is Node 26 (LTS from 2026-10-28).

## Notes

- 2026-09-19: created
- 2026-09-19: done. Node release schedule (nodejs/Release schedule.json, retrieved 2026-09-19):
  24 Active LTS until 2026-10-20, 26 LTS from 2026-10-28. Local toolchain installed with
  `mise trust && mise install` (mise 2026.6.14; CI pins 2026.9.11, which `min_version` recommends).
  The hooks resolve Node through `mise which node` while the shell's default is 22.15.0.
  The review asked that `engines` not admit untested lines: it is `^24.0.0 || >=26.0.0`, which
  excludes Node 25 (never LTS); each line is tested at its latest release.
