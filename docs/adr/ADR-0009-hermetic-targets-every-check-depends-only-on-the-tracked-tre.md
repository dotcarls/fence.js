---
id: ADR-0009
title: 'Hermetic targets: every check depends only on the tracked tree and the pinned toolchain'
status: accepted
date: 2026-09-19
deciders:
  - Tim Carlson
  - Claude (Opus 5)
tags: [toolchain, ci, reproducibility]
supersedes: null
superseded_by: null
related:
  - docs/toolchain/environment.md
  - docs/toolchain/gates.md
---

# ADR-0009 — Hermetic targets: every check depends only on the tracked tree and the pinned toolchain

## Context

The 2.0.0 tag and the push of `master` failed CI at `eslint .` with 153 errors while the same
command passed locally. The examples import `fence.js` by name; TypeScript resolved that
through the package's `exports` map to `dist/index.d.ts`. Locally `dist/` existed from an
earlier build; in CI, lint ran before any build, so every type in the examples was
unresolved. Reproduced in a fresh clone: lint fails with no `dist/`, passes after a build, and
fails again with a stale `dist/`. The owner's requirement: **every target must behave
identically whether invoked locally or in CI.**

An audit of the other targets found the same class of dependence in several places:

| Target or tool                                   | Hidden input                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `lint`                                           | `dist/` (the example imports)                                                                                         |
| `examples` (and the former `typecheck:examples`) | `dist/` as left by whatever ran last; `build` never removed files for deleted sources                                 |
| `format:check`                                   | `.prettierignore` still excluded `docs/` from when TypeDoc wrote there, so the governed documents were never checked  |
| `gates`                                          | a hard-coded skip list: an agent worktree or a scratch file under an unlisted directory changed the result            |
| ESLint                                           | its own ignore list, different from git's                                                                             |
| Vitest                                           | `CI` detection: missing snapshots are written locally and refused in CI; `.only` is allowed locally and refused in CI |
| property tests                                   | a fresh random seed per run                                                                                           |
| the toolchain itself                             | the local Node (22.15) was older than lint-staged and release-it require; CI ran newer versions                       |

## Options considered

| Option                                                                                                                                           | Pros                                                                                                                       | Cons                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Make each target hermetic: it reads only tracked files and the pinned toolchain, builds what it needs itself, and pins every CI-dependent switch | Any target, in any order, from any prior state, gives the same result; CI can run the same single command as a contributor | Targets that need `dist/` rebuild it (seconds each)                                                    |
| Order CI steps so `build` runs before `lint`                                                                                                     | One-line change                                                                                                            | Local runs still depend on whatever `dist/` exists; the next hidden input is found by the next failure |
| Run CI in a container matching the laptop                                                                                                        | Same OS image                                                                                                              | Does not remove the dependence on untracked state                                                      |

## Decision

Every npm target is hermetic. Commitments:

1. **No target reads build output it did not just produce.** The root `tsconfig.json` maps
   `fence.js` to `src/index.ts` and includes `examples/`, so editors, `typecheck`, `lint` and
   TypeDoc never look at `dist/`. The published declarations are still exercised: `examples`
   runs `build` first and then type-checks and runs the examples through
   `examples/tsconfig.dist.json`, which resolves `fence.js` through `exports` to the fresh
   `dist/`. `build` removes `dist/` before compiling; `prepack` is `build`.
2. **One ignore list.** `.gitignore` is the only list of what is not this tree's content. The
   gate walker lists files with `git ls-files --cached --others --exclude-standard`; ESLint
   imports `.gitignore` (`includeIgnoreFile`); Prettier reads it by default; `.prettierignore`
   holds only tracked files Prettier must not rewrite (`package-lock.json`). Generated blocks sit
   inside Prettier's range-ignore comments so the formatter and the generator never rewrite the
   same bytes; the `generated` gate enforces it.
3. **No CI detection changes a result.** `vitest.config.ts` sets `allowOnly: false` and
   `UPDATE_SNAPSHOT=none` unless the caller set it, so a missing snapshot fails everywhere and
   snapshots are written only with `vitest -u`. Property-based tests run from a fixed seed
   (`test/support/setup.ts`); `FAST_CHECK_SEED` explores other seeds deliberately.
4. **The toolchain is pinned and enforced.** `.nvmrc` pins the Node release every contributor
   and the primary CI leg use (24.21.0 at this writing). `package.json` `devEngines` declares
   the supported toolchain range — the intersection of every dev tool's `engines`
   (`^22.22.2 || ^24.15.0 || >=26.0.0`) and npm ≥ 10.9 — with `onFail: "error"`, so npm refuses
   to install or run a script under anything else. The other CI legs pin exact versions of the
   other supported lines (22.23.2, 26.9.0). Hooks inherit their caller's Node, so the Claude Code
   and git hooks resolve the pinned release through `tools/hooks/pinned-node.sh`; when it is not
   installed they name the check that did not run instead of reporting a pass.
5. **CI runs the same entry point.** Each CI leg runs `npm ci` then `npm run check`, the command
   `CONTRIBUTING.md` tells a contributor to run; the chain is defined once, in `package.json`.

## Consequences

The failure class is closed rather than the one instance: a result can only differ between two
machines if their tracked trees or pinned toolchains differ, and both are visible. Contributors
must switch to the `.nvmrc` Node (`n auto`, `nvm use`, `fnm use`); npm says so if they do not.
`npm run check` rebuilds `dist/` up to three times (examples, two packs) at about two seconds
each. Changing the Node version means editing `.nvmrc`, the two pinned CI legs, and, when a tool
raises its floor, `devEngines`.

## Verification

In a fresh clone with no `dist/`, and again in the working tree with a deliberately stale
`dist/`, each target run on its own and `npm run check` as a whole give the same results
(recorded in FJ-0014). The toolchain tests show the gate walker ignoring git-ignored files and
the `generated` gate refusing an unshielded block. CI runs `npm run check` on three Node lines.

## Links

FJ-0014 · [environment](../toolchain/environment.md) · [gates](../toolchain/gates.md) ·
ADR-0004 · ADR-0010

## Amendment A1 — 2026-09-19: the pin moves to mise.toml

Commitment 4 is carried out with mise
([ADR-0011](ADR-0011-mise-manages-the-toolchain-the-active-lts-node-is-the-defaul.md)):
`mise.toml` replaces `.nvmrc` as the pin, CI installs from it with `jdx/mise-action`, the only
other tested line is the upcoming LTS (26.9.0, through `MISE_NODE_VERSION`), `devEngines` is
`^24.15.0 || >=26.0.0`, and the hooks resolve Node with `mise which node`.

## Amendment A2 — 2026-09-19: the holes a review found

An adversarial review of this decision reproduced three remaining dependences, each closed:

- **`check:package` read an existing `dist/`**: publint packs with `--ignore-scripts`, so with no
  `dist/` it failed and with a stale one it passed. `scripts/check-package.mjs` now builds, packs
  once without lifecycle scripts (so `npm run check` no longer rewrites `.git/hooks` through
  `prepare`) and lints that tarball with publint (strict) and attw.
- **Ignore lists still differed**: `git ls-files --exclude-standard` also reads nested
  `.gitignore` files, `.git/info/exclude` and a global excludes file, which ESLint and Prettier do
  not. The walker now applies only the root `.gitignore`, and the `ignore-files` gate refuses any
  other ignore file in the tree.
- **A drifted `node_modules` went unnoticed**: `npm run check` now starts with `verify:install`,
  which compares npm's record of the install with `package-lock.json` entry by entry.

What a working tree can still add, uncommitted edits and files not yet added to git, is closed by
`npm run check:clean`: `npm run check` on the HEAD commit exported with `git archive` and
installed with `npm ci`. The pre-push hook runs it, so a push has passed the same check CI runs.
The checkpoint gate's "not in the future" rule is the one rule that reads the clock; it has a
day of tolerance and can only move from failing to passing as time passes, never the reverse.
