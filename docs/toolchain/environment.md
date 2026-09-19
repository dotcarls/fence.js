---
title: Environment
doc_type: toolchain
status: living
updated: '2026-09-19'
---

# Environment

Every target gives the same result on a contributor's machine and in CI because each one
depends only on the tracked tree and the pinned toolchain ([ADR-0009](../adr/ADR-0009-hermetic-targets-every-check-depends-only-on-the-tracked-tre.md)).
This page lists what is pinned and how.

## The toolchain

| Concern                 | Pinned by                                                                                    | Value                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Node for development    | [`.nvmrc`](../../.nvmrc) — used by contributors and the primary CI leg                       | 24.21.0 (Active LTS)                                                                                    |
| Supported dev toolchain | `package.json` `devEngines` with `onFail: "error"`: npm refuses to install or run outside it | Node `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`, npm `>=10.9.0`                                             |
| Other CI legs           | `.github/workflows/checks.yml`                                                               | Node 22.23.2 and 26.9.0                                                                                 |
| Node for consumers      | `package.json` `engines` (floors tested by the `consume` CI job)                             | `>=20.19.0`; tested on 20.19.0 and 22.12.0                                                              |
| Dependencies            | `package-lock.json`, installed with `npm ci`                                                 | every devDependency at its latest release; see below                                                    |
| Actions                 | commit SHAs in the workflows, version in a comment, updated weekly by Dependabot             | checkout 7.0.1, setup-node 7.0.0, upload-pages-artifact 5.0.0, deploy-pages 5.0.1, codeql-action 4.38.1 |

The `devEngines` range is the intersection of the dev tools' own `engines` fields (lint-staged
and release-it set the Node 22 floor, release-it the Node 24 floor). Switch to the pinned Node
with your version manager (`n auto`, `nvm use`, `fnm use`, `mise use`); npm names the problem
if you do not.

**The one dependency not at its latest release** is TypeScript: 6.0.3, the newest release the
latest typescript-eslint (8.70.0, `typescript <6.1.0`) and TypeDoc (0.28.20, `6.0.x`) accept.
TypeScript 7 is adopted when both do ([ADR-0004 A1](../adr/ADR-0004-typescript-toolchain.md#amendment-a1--2026-09-19-dependency-currency-and-the-pinned-toolchain)).

## Setup

```sh
n auto             # or nvm use / fnm use: the Node in .nvmrc
npm install        # also installs the git hooks (simple-git-hooks)
npm run check      # everything CI runs: CI runs exactly this command
```

## The check chain

`npm run check` = `gates` → `typecheck` → `lint` → `format:check` → `test:coverage` →
`examples` → `check:package` → `docs`. Each target is self-contained and can be run alone, in
any order, from any prior state:

| Target          | Reads                                                  | Notes                                                                                                                 |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `gates`         | files git would commit (`git ls-files`)                | [gates](gates.md)                                                                                                     |
| `typecheck`     | `src/`, `test/`, `examples/`, `tools/gates/`           | `fence.js` resolves to `src/` (root `tsconfig.json` paths)                                                            |
| `lint`          | the same project; ignores what `.gitignore` ignores    | never reads `dist/`                                                                                                   |
| `format:check`  | every file git would commit except `package-lock.json` | generated blocks are inside `<!-- prettier-ignore-start/end -->`                                                      |
| `test:coverage` | `test/`, `src/`                                        | `.only` refused and missing snapshots fail everywhere; property tests use a fixed seed (`FAST_CHECK_SEED` to explore) |
| `examples`      | a fresh `dist/` it builds itself                       | type-checks and runs `examples/` against the built package (`examples/tsconfig.dist.json`)                            |
| `check:package` | the packed tarball (`prepack` builds it)               | publint, `attw --profile esm-only`                                                                                    |
| `docs`          | the root project                                       | TypeDoc into `site/`; warnings fail                                                                                   |

`build` removes `dist/` before compiling, so a deleted source never leaves a stale module
behind.

## Updating the toolchain

- **npm dependencies:** Dependabot opens a grouped weekly PR; `npm run check` decides.
- **Actions:** Dependabot updates the SHA pins weekly.
- **Node:** edit `.nvmrc` and the two pinned legs in `checks.yml` together; raise `devEngines`
  when a tool raises its floor.
