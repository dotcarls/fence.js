---
id: FJ-0023
title: 'Run CodeQL locally with the same CLI and queries as CI'
type: task
status: in-progress
priority: p0
milestone: '2.0.2'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: [FJ-0024]
blocked_by: []
acceptance_criteria:
  - text: 'npm run codeql runs CodeQL with the CLI pinned in mise.toml and the query pack pinned in scripts/codeql.mjs (the ones CI used for the failing run) over the files a commit would contain, and fails on any finding, naming each'
    satisfied: true
    evidence: 'scripts/codeql.mjs'
    verified_by: 'reproduced the CI finding exactly on the unfixed tree (FJ-0022 notes)'
  - text: 'It refuses any CodeQL but the pinned version and names the remedy'
    satisfied: true
    evidence: 'docs/work/items/FJ-0023-run-codeql-locally-with-the-same-cli-and-queries-as-ci.md#notes'
    verified_by: 'run with no codeql on PATH and with a fake 2.26.0: both exit 1 with "run mise install"'
  - text: 'The pre-push hook runs it on the exported HEAD (npm run check:clean)'
    satisfied: false
    evidence: null
    verified_by: null
  - text: "CI's CodeQL job runs the same command and uploads its SARIF to code scanning; the other jobs install Node alone; actionlint accepts the workflows"
    satisfied: true
    evidence: '.github/workflows/checks.yml'
    verified_by: 'actionlint 1.7.12; install_args and upload-sarif inputs checked at the pinned SHAs. Behavior on GitHub is verified by FJ-0025'
  - text: "mise.toml requires a mise that installs the pinned CLI, and the hooks report mise's own reason when mise refuses"
    satisfied: true
    evidence: 'tools/hooks/pinned-node.sh'
    verified_by: "mise.toml min_version hard 2026.9.11; with a floor above the installed mise, the hook message quotes mise's error"
  - text: 'The decision is recorded and the environment, gates, release and contributor documents describe the target'
    satisfied: true
    evidence: 'docs/adr/ADR-0012-codeql-is-a-local-target-with-the-cli-pinned-by-mise-run-by.md'
    verified_by: 'npm run gates: PASS (xref, reachability)'
links:
  code:
    [
      scripts/codeql.mjs,
      scripts/check-clean.mjs,
      .github/workflows/checks.yml,
      mise.toml,
      tools/hooks/pinned-node.sh,
    ]
  docs: [docs/toolchain/environment.md, docs/toolchain/release-process.md]
  tests: []
  adrs: [ADR-0012]
---

# FJ-0023 — Run CodeQL locally with the same CLI and queries as CI

## Description

CodeQL ran only in CI, through `codeql-action`, so its finding (FJ-0022) was first seen after the
push. The owner directed that the failure be reproduced locally and CodeQL made part of the
project's gate and hook checks. Decided in ADR-0012.

## Notes

- 2026-09-19: created.
- 2026-09-19: why it is not a gate or a step of `npm run check`:
  - The CLI is 2.7 GB installed.
  - An analysis takes about 18 s.

  The pre-push hook and one CI job run it (ADR-0012).

- 2026-09-19: CodeQL for mise comes from `github:github/codeql-cli-binaries`. mise 2026.6.14 failed
  its GitHub artifact attestation check ("TSA timestamp verification failed"); mise 2026.9.11
  passed it. The attestation check was not bypassed.
- 2026-09-19: refusal, checked:
  - With no CodeQL on PATH and no mise:
    `codeql: CodeQL 2.27.0 (mise.toml) is not installed; run mise install`, exit 1.
  - With a fake `codeql` printing 2.26.0:
    `... is not installed (found: codeql is 2.26.0); run mise install`, exit 1.
