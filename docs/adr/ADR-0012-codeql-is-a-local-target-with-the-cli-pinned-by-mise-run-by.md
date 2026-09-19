---
id: ADR-0012
title: 'CodeQL is a local target with the CLI pinned by mise, run by the pre-push hook and by CI'
status: accepted
date: 2026-09-19
deciders:
  - Tim Carlson
  - Claude (Opus 5)
tags: [toolchain, ci, security, codeql, mise]
supersedes: null
superseded_by: null
related:
  - scripts/codeql.mjs
  - mise.toml
  - docs/toolchain/environment.md
---

# ADR-0012 — CodeQL is a local target with the CLI pinned by mise, run by the pre-push hook and by CI

## Context

CodeQL was the one check that ran only in CI: `github/codeql-action` `init` and `analyze` in
`checks.yml`, with whatever CLI that action bundles. On 2026-09-19 it reported
`js/incomplete-sanitization` at `tools/gates/generate.ts:153` on `main` (run 35448397531) and on
`v2.0.1` (run 35448397495). Every other job passed, so Pages did not deploy and 2.0.1 was not
published (ADR-0010 working as meant). Nobody could have seen the finding before pushing,
which ADR-0009 rules out: every target behaves the same locally and in CI. The owner directed:
reproduce the failure locally, fix it, and make CodeQL part of the project's gate and hook
checks.

Measured on 2026-09-19:

- The CodeQL CLI 2.27.0 takes 2.7 GB installed on macOS, with every language's extractor; the
  Linux download is 410 MB zipped.
- An analysis of this tree takes about 18 s on the owner's machine.
- mise 2026.6.14 fails GitHub artifact attestation verification of the CodeQL release ("TSA
  timestamp verification failed"). mise 2026.9.11 verifies it.

## Options considered

| Option                                                                               | Pros                                                          | Cons                                                                                                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A. A gate: every edit and every commit                                               | Earliest possible signal                                      | About 18 s on every edit and commit; 2.7 GB for anyone who edits a document                                                      |
| B. `npm run codeql`, a target of its own, run by the pre-push hook and by one CI job | Same command and CLI everywhere; runs where a push is decided | Not per edit; contributors who push need the 2.7 GB CLI                                                                          |
| C. A step of `npm run check`                                                         | One command covers everything                                 | Both CI check jobs install or restore 2.7 GB and run it twice; everyone running `check` needs it; crowds the 10 GB Actions cache |
| D. Keep `codeql-action` `init`/`analyze` in CI only                                  | Nothing to install locally                                    | The failure that happened: a finding first seen after the push, from a CLI no contributor runs                                   |

## Decision

**B.** CodeQL is `npm run codeql`, one command that runs the same way on a contributor's
machine, in the pre-push hook and in CI.

1. **Pins.**
   - `mise.toml` pins the CLI: `codeql = "2.27.0"`, the release `codeql-action` 4.38.1 bundles.
   - `scripts/codeql.mjs` pins the query pack, the suite and the category:
     `codeql/javascript-queries@2.4.5`, `javascript-security-and-quality`,
     `/language:javascript-typescript`.
   - The two pins move together.
2. **What it analyzes.** The gate walker's list (tracked files plus untracked ones the root
   `.gitignore` does not ignore), copied to a temporary directory. On the export `check:clean`
   makes, that is exactly the commit.
3. **Which CLI it uses.** Only the pinned one: `mise which codeql`, or a `codeql` on PATH at
   exactly that version. Any other version is refused, with `mise install` as the remedy.
4. **When it fails.** On any result. It prints each result as `rule at file:line`.
5. **Where it runs.**
   - Pre-push: `npm run check:clean` runs it on the exported HEAD after `npm run check`.
   - Not in `npm run check`, and not a gate, because of the cost measured above.
6. **In CI.**
   - The `CodeQL` job in `checks.yml` installs the mise toolchain without a cache and runs
     `npm run codeql -- --sarif <path>`.
   - It then uploads that SARIF to code scanning with `github/codeql-action/upload-sarif`,
     whether or not it holds findings.
   - Its failure stops Pages and publishing (ADR-0010).
   - Every other job installs Node alone (`install_args: node`).
7. **mise.** The `min_version` hard floor rises to 2026.9.11, the release verified to install
   the pinned CLI (2026.6.14 fails its attestation check; releases in between were not tried). Attestation verification is never turned off to install an older one.

## Consequences

- A contributor who pushes needs mise 2026.9.11 or later and room for CodeQL (2.7 GB on macOS).
- The pre-push hook takes about 20 s longer.
- The first run fetches the query pack from GitHub's container registry by exact version, a
  network dependency of the same kind as `npm ci`.
- New CodeQL queries arrive only when the pins move, the same way a new ESLint rule arrives only
  with a new ESLint. The pins move by hand with `codeql-action` (Dependabot does not read
  `mise.toml`). Upgrading means:
  - edit `mise.toml` and `QUERY_PACK` in `scripts/codeql.mjs` together;
  - run `npm run codeql`;
  - fix or record what it reports.
- The code-scanning analysis keeps its category, so earlier alerts close as fixes land.

## Verification

Recorded in FJ-0023:

- The final script reproduces the CI finding on the unfixed tree: 1 result at the same file and
  line, exit 1.
- It reports none once FJ-0022 is fixed.
- `check:clean` runs it on a clean export.
- actionlint accepts the workflows.

## Links

FJ-0022 · FJ-0023 · ADR-0009 · ADR-0010 · ADR-0011 · [environment](../toolchain/environment.md)
