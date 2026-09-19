---
id: FJ-0014
title: 'Check targets depend on build output and local state, so lint fails in CI'
type: bug
status: done
priority: p0
milestone: '2.0.1'
created: 2026-09-19
updated: 2026-09-19
parent: null
blocks: []
blocked_by: []
acceptance_criteria:
  - text: 'eslint, typecheck and every other npm target give the same result in a fresh clone with no dist/ as in a working tree with a stale dist/'
    satisfied: true
    evidence: 'docs/work/items/FJ-0014-check-targets-depend-on-build-output-and-local-state-so-lint.md#notes'
    verified_by: 'every target run alone, lint first, in fresh copies and a hostile working tree (table in Notes)'
  - text: 'Targets that need a build build it themselves from a clean dist/'
    satisfied: true
    evidence: 'package.json'
    verified_by: 'scripts: build cleans dist/; examples builds first; prepack builds'
  - text: 'Every tool ignores exactly what git ignores, and the gate walker lists files through git'
    satisfied: true
    evidence: 'tools/gates/repo.ts'
    verified_by: 'test/toolchain/gates.test.ts (walker ignores git-ignored files; generated gate requires the prettier shield)'
  - text: 'The toolchain Node version is pinned (.nvmrc) and enforced (devEngines) for installs and runs'
    satisfied: true
    evidence: 'mise.toml'
    verified_by: 'npm run gates under Node 22.15 fails with EBADDEVENGINES; passes under 24.21.0'
  - text: 'Randomized tests use a fixed seed so a run is reproducible'
    satisfied: true
    evidence: 'test/support/setup.ts'
    verified_by: 'identical 144 tests and coverage on three Node lines'
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# FJ-0014 — Check targets depend on build output and local state, so lint fails in CI

## Description

The 2.0.0 tag and the master push failed CI at eslint: the examples import fence.js by name, which resolved to dist/index.d.ts; locally dist/ existed from an earlier build, in CI lint ran before build. Every target must behave identically locally and in CI.

## Notes

- 2026-09-19: created
- 2026-09-19: root cause: `examples/` import `fence.js` by name, which resolved through `exports` to
  `dist/index.d.ts`; locally `dist/` existed, in CI lint ran before build. Reproduced in a fresh
  clone of 2.0.0: `eslint .` gives 153 errors with no `dist/`, 0 after a build, 153 again with a
  stale `dist/index.d.ts`. The audit found the other hidden inputs recorded in ADR-0009.
- 2026-09-19: verified. Each target run alone in this order, then `npm run check`:

  | Tree                                                                                                          | Node    | lint | typecheck | gates | format:check | test:coverage | examples | check:package | docs | check |
  | ------------------------------------------------------------------------------------------------------------- | ------- | ---- | --------- | ----- | ------------ | ------------- | -------- | ------------- | ---- | ----- |
  | fresh copy of the commit, no `dist/`, `npm ci`                                                                | 24.21.0 | 0    | 0         | 0     | 0            | 0             | 0        | 0             | 0    | 0     |
  | fresh copy, no `dist/`                                                                                        | 22.23.2 | 0    | 0         | 0     | 0            | 0             | 0        | 0             | 0    | 0     |
  | fresh copy, no `dist/`                                                                                        | 26.9.0  | 0    | 0         | 0     | 0            | 0             | 0        | 0             | 0    | 0     |
  | working tree with a stale `dist/` and `site/` and an ignored `.claude/worktrees` file that breaks three gates | 24.21.0 | 0    | 0         | 0     | 0            | 0             | 0        | 0             | 0    | 0     |

  All three fresh runs: 144 tests passed, statements 99.73% (380/381). The build removed the
  planted stale module. Negative controls with no `dist/`: a type error planted in
  `examples/basic.ts` fails `typecheck` and `examples` (TS2345); a planted `any` access fails
  `lint` (no-explicit-any, no-unsafe-member-access), so lint is type-aware on the examples.
  TypeDoc also read the clone's `origin` remote for source links (found when the fresh copy had
  none); it now uses an explicit template.

- 2026-09-19: the first real stop after the change showed one more dependence: the Claude Code
  hooks (and git hooks started by a GUI) run under their caller's Node, which `devEngines` now
  refuses. `tools/hooks/pinned-node.sh` resolves the `.nvmrc` release from the common version
  managers; verified with it missing (hooks name the check that did not run; Stop still enforces
  freshness) and present (simulated `n` prefix: gates pass, a stale checkpoint blocks).
- 2026-09-19: the pin moved from `.nvmrc` to `mise.toml` (FJ-0020, ADR-0011); criterion 4's evidence
  now points there. The 22.23.2 row above was a supported line when measured; it no longer is.
- 2026-09-19: an adversarial review (fence-reviewer) reproduced three dependences the table above
  missed, because `examples` ran before `check:package` and built `dist/` for it: `check:package`
  read an existing `dist/` (publint packs with `--ignore-scripts`); the gate walker's
  `--exclude-standard` read more ignore sources than ESLint and Prettier; and a drifted
  `node_modules` went unnoticed. All three are fixed (ADR-0009 A2): `scripts/check-package.mjs`
  builds and packs itself, the walker applies only the root `.gitignore` and the `ignore-files`
  gate refuses other ignore files, and `verify:install` starts `npm run check`. `check:clean` (the
  pre-push hook) runs the chain on a clean export of HEAD.
- 2026-09-19: re-verified under mise in fresh copies with no `dist/`, each target alone in a
  hostile order (`check:package` first): every target identical on Node 24.21.0 and 26.9.0,
  `npm run check` writes nothing to `.git/hooks`. Negative controls: prettier 3.9.7 installed
  over the locked 3.9.8 fails `verify:install` naming the package; a nested `.gitignore` fails
  `ignore-files`; a file listed only in `.git/info/exclude` is seen by the gates.
