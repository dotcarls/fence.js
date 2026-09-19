---
id: FJ-0012
title: 'Verify browser consumption from an ESM CDN'
type: task
status: backlog
priority: p2
milestone: '2.x'
created: 2026-09-16
updated: 2026-09-16
parent: null
blocks: []
blocked_by: []
owner: agent
acceptance_criteria:
  - text: 'examples/browser.html loads fence.js from esm.sh and jsDelivr and runs in a current browser'
    satisfied: false
    evidence: null
    verified_by: human
links:
  code: [examples/browser.html]
  docs: []
  tests: []
  adrs: [ADR-0002]
---

# FJ-0012 — Verify browser consumption from an ESM CDN

## Description

ADR-0002's browser condition was verified structurally (no Node built-ins in dist) but the CDN import itself could not be exercised from the development machine (esm.sh timed out). Do it once 2.0.0 is published.

## Notes

- 2026-09-16: created.
