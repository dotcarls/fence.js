---
id: ADR-0004
title: 'Toolchain: TypeScript 6.0 pinned, tsc build, Vitest, ESLint flat config, Prettier'
status: accepted
date: '2026-09-16'
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [toolchain, typescript, testing, lint]
supersedes: null
superseded_by: null
related: []
---

# ADR-0004 — Toolchain: TypeScript 6.0 pinned, tsc build, Vitest, ESLint flat config, Prettier

## Context

The 1.x toolchain was Babel 7, Rollup 2 with deprecated plugins, Jest 29, ESDoc (unmaintained), a
legacy ESLint config whose glob never reached `src/lib`, Travis CI (defunct) and 1,619 dev
dependencies with 111 audit findings. Several 2026 constraints shaped the replacement: TypeScript
7 (the Go port) is the latest release but typescript-eslint supports `< 6.1` and TypeDoc `<= 6.0`;
tsdown requires Node 22.18 while the development machine runs 22.15; Vitest 5 dropped its typed
`bench` export.

## Options considered

| Option                                                                                                                  | Pros                                                        | Cons                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TypeScript `~6.0`, `tsc` build, Vitest 5, ESLint 10 flat + typescript-eslint strict type-checked, Prettier 3, tinybench | Every tool supports every other; zero bundler; strict types | Pinned below the newest TypeScript until the ecosystem catches up                 |
| TypeScript 7                                                                                                            | Fastest compiler                                            | Lint and docs tooling do not support it yet                                       |
| tsdown/tsup bundling                                                                                                    | Single-file output                                          | Node 22.18 requirement; nothing to bundle in a one-entry, zero-dependency library |
| Jest with ts-jest                                                                                                       | Familiar                                                    | Slower; ESM friction; no typecheck mode                                           |

## Decision

The first option, with these settings: `strict`, `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`, `isolatedModules`,
`erasableSyntaxOnly`, `target`/`lib` ES2022, `module` NodeNext, relative imports with `.js`;
coverage thresholds 95% on every metric; type tests through Vitest typecheck mode; property
tests with fast-check; differential tests against validate.js and Joi; examples type-checked
against `dist/` and run in CI. Development needs Node 22 or 24.

## Consequences

467 dev packages, two dev-only audit findings (the comparison libraries). Revisit the
TypeScript pin when typescript-eslint and TypeDoc support 7.

## Verification

`npm run check` and the CI matrix (Node 22, 24, 26).

## Links

[environment](../toolchain/environment.md) · FJ-0003

## Amendment A1 — 2026-09-19: dependency currency and the pinned toolchain

Every dependency is kept at its latest release (FJ-0016). One exception is recorded here:
**TypeScript stays on the newest 6.x (6.0.3)** although 7.0.2 is the latest release, because the
latest typescript-eslint (8.70.0) declares `typescript >=4.8.4 <6.1.0` and the latest TypeDoc
(0.28.20) accepts only up to 6.0.x. Dependabot ignores TypeScript majors until both widen;
revisit then. The Node toolchain is now pinned (`.nvmrc`) and enforced (`devEngines`) per
ADR-0009, replacing "Node 22 or 24" above.

## Amendment A2 — 2026-09-19: mise

The Node toolchain is pinned in `mise.toml`, not `.nvmrc`, and only the Active LTS and upcoming
LTS lines are tested
([ADR-0011](ADR-0011-mise-manages-the-toolchain-the-active-lts-node-is-the-defaul.md)).
