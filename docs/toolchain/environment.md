---
title: Environment
doc_type: toolchain
status: living
updated: "2026-09-16"
---

# Environment

| Concern                     | Requirement                                                                                                | Why                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Runtime for consumers       | Node.js ≥ 20.19, or an evergreen browser (native ES modules)                                               | `require(esm)` is unflagged from 20.19; ES2022 output ([ADR-0002](../adr/ADR-0002-esm-only-distribution.md)) |
| Runtime for development     | Node.js 22 (LTS) or 24; `.nvmrc` says `22`                                                                 | Vitest 5 needs 22.12+                                                                                        |
| Language                    | TypeScript `~6.0`                                                                                          | The last release typescript-eslint and TypeDoc support ([ADR-0004](../adr/ADR-0004-typescript-toolchain.md)) |
| Build                       | `tsc` (no bundler)                                                                                         | Single entry, zero dependencies                                                                              |
| Tests                       | Vitest 5 with v8 coverage (thresholds 95%), type tests via `expectTypeOf`, property tests via fast-check   |                                                                                                              |
| Lint / format               | ESLint 10 flat config + typescript-eslint strict type-checked, Prettier 3                                   |                                                                                                              |
| Gate tool                   | `tsx`, `ajv`, `yaml` (dev dependencies)                                                                    | [gates](gates.md)                                                                                            |
| Package checks              | publint, `@arethetypeswrong/cli --profile esm-only`                                                        |                                                                                                              |
| API reference               | TypeDoc → `site/` (gitignored), published by the docs workflow to GitHub Pages                              |                                                                                                              |
| Release                     | release-it (local: bump, changelog check, commit, tag); GitHub Actions publish with npm trusted publishing | [release-process](release-process.md)                                                                        |

## Setup

```sh
npm install        # installs the git hooks as well (simple-git-hooks)
npm run check      # everything CI runs, in the same order
```

`npm run check` = `gates` → `typecheck` → `lint` → `format:check` → `test:coverage` → `build` →
`typecheck:examples` → `examples` → `check:package`.
