---
id: ADR-0002
title: 'ESM-only distribution with browser support; Node 20.19 or newer'
status: accepted
date: '2026-09-16'
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [distribution, packaging, browser]
supersedes: null
superseded_by: null
related: []
---

# ADR-0002 — ESM-only distribution with browser support; Node 20.19 or newer

## Context

1.x shipped CommonJS, ES module and UMD builds from a Rollup pipeline with eight plugins and
declared Node ≥ 10. The owner accepted ESM-only distribution on one condition: browsers must
still be able to consume the package.

## Options considered

| Option                              | Pros                                                                                                                       | Cons                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ESM only, `exports` map, no bundler | One artifact; `require(esm)` works on Node 20.19+/22.12+; browsers load ES modules natively and ESM CDNs serve the package | Node < 20.19 CommonJS consumers need a dynamic import                                             |
| Dual ESM + CJS                      | Older Node `require()`                                                                                                     | The dual-package hazard (two copies of the classes, `instanceof` across formats fails); a bundler |
| Keep UMD too                        | `<script src>` global                                                                                                      | Nobody bundles that way in 2026; a global is one more surface to keep                             |

## Decision

ESM only. `package.json` declares `"type": "module"`, an `exports` map with a `types`
condition first, `sideEffects: false`, `engines.node >= 20.19.0`, and ships `dist/` (compiled by
`tsc` with declarations and source maps), `src/` (for the maps), `README.md`, `MIGRATING.md`,
`CHANGELOG.md`. No Node built-in is imported anywhere in `src/`, so the same files run in a
browser via `<script type="module">` and any ESM CDN. Consumers on Node need 20.19 or newer.

## Consequences

One build, no bundler, `publint` and `attw --profile esm-only` green. A CommonJS consumer on an
old Node must `await import(...)`. The UMD global is gone (documented in MIGRATING).

## Verification

`npm run check:package`; the CI job that `import()`s and `require()`s the built `dist/` on
Node 20 and 22; a grep of `dist/` for Node built-ins in review.

## Links

[release process](../toolchain/release-process.md) · FJ-0003 · FJ-0012

## Amendment A1 — 2026-09-19: Node 24 or newer

The Node floor for consumers is now `engines.node: ^24.0.0 || >=26.0.0`, the current Active LTS
line and the upcoming LTS onward; the
lines tested are that one and the upcoming LTS
([ADR-0011](ADR-0011-mise-manages-the-toolchain-the-active-lts-node-is-the-defaul.md)). Node
20.19 and 22.12 above are no longer claimed or tested. ES modules only and browser support are
unchanged.
