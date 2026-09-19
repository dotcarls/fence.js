---
title: Environment
doc_type: toolchain
status: living
updated: '2026-09-19'
---

# Environment

Every target gives the same result on a contributor's machine and in CI because each one
depends only on the tracked tree and the pinned toolchain
([ADR-0009](../adr/ADR-0009-hermetic-targets-every-check-depends-only-on-the-tracked-tre.md)),
and the toolchain is managed by mise everywhere
([ADR-0011](../adr/ADR-0011-mise-manages-the-toolchain-the-active-lts-node-is-the-defaul.md)),
CodeQL included
([ADR-0012](../adr/ADR-0012-codeql-is-a-local-target-with-the-cli-pinned-by-mise-run-by.md)).

## The toolchain

| Concern                 | Pinned by                                                                                     | Value                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Toolchain manager       | [`mise.toml`](../../mise.toml) `min_version`; CI pins the mise release in the workflows       | mise ≥ 2026.9.11, the oldest verified to install the pinned CodeQL (CI: 2026.9.11)                                        |
| Node (default)          | `mise.toml` — the current Active LTS release, used by contributors and every CI job           | 24.21.0                                                                                                                   |
| Node (also tested)      | `MISE_NODE_VERSION` on the second leg of `check` and `consume` in `checks.yml`                | 26.9.0, the upcoming LTS (LTS from 2026-10-28); no other line is tested                                                   |
| CodeQL                  | `mise.toml` (CLI); `QUERY_PACK` in [`scripts/codeql.mjs`](../../scripts/codeql.mjs) (queries) | CLI 2.27.0, `codeql/javascript-queries@2.4.5`, suite `javascript-security-and-quality`: what codeql-action 4.38.1 bundles |
| Supported dev toolchain | `package.json` `devEngines` with `onFail: "error"`: npm refuses to install or run outside it  | Node `^24.15.0 \|\| >=26.0.0`, npm `>=10.9.0`                                                                             |
| Node for consumers      | `package.json` `engines`                                                                      | `^24.0.0 \|\| >=26.0.0`: the tested LTS lines, each at its latest release                                                 |
| Dependencies            | `package-lock.json`, installed with `npm ci`                                                  | every devDependency at its latest release; see below                                                                      |
| Actions                 | commit SHAs in the workflows, version in a comment, updated weekly by Dependabot              | checkout 7.0.1, mise-action 4.3.0, upload-pages-artifact 5.0.0, deploy-pages 5.0.1, codeql-action/upload-sarif 4.38.1     |

The `devEngines` floor on the Node 24 line is release-it's (`^24.15.0`). The hooks — Claude
Code's and git's — find the pinned Node with `mise which node`, so they work even when another
Node is your shell's default ([agents-and-skills](agents-and-skills.md#hooks)).

**The one dependency not at its latest release** is TypeScript: 6.0.3, the newest release the
latest typescript-eslint (8.70.0, `typescript <6.1.0`) and TypeDoc (0.28.20, `6.0.x`) accept.
TypeScript 7 is adopted when both do ([ADR-0004 A1](../adr/ADR-0004-typescript-toolchain.md#amendment-a1--2026-09-19-dependency-currency-and-the-pinned-toolchain)).

## Setup

```sh
mise trust && mise install   # the toolchain in mise.toml (install mise: https://mise.jdx.dev)
mise exec -- npm install     # or run `mise activate` in your shell once and drop the prefix
mise exec -- npm run check   # everything CI runs: CI runs exactly this command
MISE_NODE_VERSION=26.9.0 mise exec -- npm run check   # the upcoming-LTS leg
mise exec -- npm run codeql  # CodeQL, as CI runs it (the pre-push hook runs it too)
```

## The check chain

`npm run check` = `verify:install` → `gates` → `typecheck` → `lint` → `format:check` →
`test:coverage` → `examples` → `check:package` → `docs`. Each target is self-contained and can be run alone, in
any order, from any prior state:

| Target           | Reads                                                  | Notes                                                                                                                 |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `verify:install` | `node_modules` against `package-lock.json`             | fails on any version or integrity drift: run `npm ci`                                                                 |
| `gates`          | files git would commit under the root `.gitignore`     | [gates](gates.md)                                                                                                     |
| `typecheck`      | `src/`, `test/`, `examples/`, `tools/gates/`           | `fence.js` resolves to `src/` (root `tsconfig.json` paths)                                                            |
| `lint`           | the same project; ignores what `.gitignore` ignores    | never reads `dist/`                                                                                                   |
| `format:check`   | every file git would commit except `package-lock.json` | generated blocks are inside `<!-- prettier-ignore-start/end -->`                                                      |
| `test:coverage`  | `test/`, `src/`                                        | `.only` refused and missing snapshots fail everywhere; property tests use a fixed seed (`FAST_CHECK_SEED` to explore) |
| `examples`       | a fresh `dist/` it builds itself                       | type-checks and runs `examples/` against the built package (`examples/tsconfig.dist.json`)                            |
| `check:package`  | a tarball it builds and packs itself                   | publint (strict) and `attw --profile esm-only` on that tarball; packing runs no lifecycle scripts                     |
| `docs`           | the root project                                       | TypeDoc into `site/`; warnings fail                                                                                   |

`build` removes `dist/` before compiling, so a deleted source never leaves a stale module
behind.

**What only a clean export can promise.** A working tree can hold edits not yet committed and
files not yet added to git; CI sees neither. `npm run check:clean` runs `npm run check` on the
HEAD commit exported with `git archive` and installed with `npm ci`, then `npm run codeql` on
the same export, and the pre-push hook runs it, so a push has passed exactly the checks CI will
run.

## CodeQL

`npm run codeql` analyzes the files git would commit with the CLI `mise.toml` pins and the query
pack `scripts/codeql.mjs` pins, and fails on any finding, printing each as `rule at file:line`.
It refuses any other CodeQL version. CI's `CodeQL` job runs the same command and uploads the
SARIF to code scanning. It is not a step of `npm run check` and not a gate: the CLI is 2.7 GB
installed and an analysis takes about 18 s, so the pre-push hook and CI run it, and the per-edit
and pre-commit hooks do not
([ADR-0012](../adr/ADR-0012-codeql-is-a-local-target-with-the-cli-pinned-by-mise-run-by.md)).
Every CI job that does not run CodeQL installs Node alone (`install_args: node`).

## Updating the toolchain

- **npm dependencies:** Dependabot opens a grouped weekly PR; `npm run check` decides.
- **Actions:** Dependabot updates the SHA pins weekly.
- **Node patch releases:** edit `mise.toml` (default line) and `node-override` in `checks.yml`
  (upcoming line) together.
- **LTS transitions:** when the upcoming LTS enters Active LTS, it becomes the `mise.toml` pin,
  the next even-numbered release (once published) becomes the tested upcoming LTS, `devEngines`
  follows, and `engines` rises in the next major release (ADR-0011).
- **mise:** raise the version in the workflows and `min_version` in `mise.toml` together.
- **CodeQL:** move the CLI in `mise.toml` and `QUERY_PACK` in `scripts/codeql.mjs` together, to
  what the current codeql-action bundles; run `npm run codeql` and fix what it reports.
  Dependabot does not read `mise.toml`.
