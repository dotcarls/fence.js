---
id: ADR-0005
title: '2.0 ships no 1.x compatibility surface'
status: accepted
date: '2026-09-16'
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [api, compatibility, semver]
supersedes: null
superseded_by: null
related: []
---

# ADR-0005 — 2.0 ships no 1.x compatibility surface

## Context

The rewrite first kept deprecated aliases (`fork`, `serialize`, `hydrate`, `forAll`, `forAny`,
`forOne`, the default export) and a v1 serialization importer so 1.x code could migrate
gradually. The owner directed that backward compatibility is not needed and that deprecated APIs
and other residual content be removed.

## Options considered

| Option                                                                                            | Pros                                          | Cons                                                              |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Remove every alias and the v1 importer in 2.0; document each replacement and a conversion snippet | One API to learn, test and type; no dead code | 1.x callers must edit every call site (TypeScript points at each) |
| Keep aliases through 2.x, remove in 3.0                                                           | Gradual                                       | Two names for everything; tests and docs for both                 |

## Decision

The first option. 2.0 exports exactly the 2.0 API: `FenceBuilder`, `Fence`, `Result`, the error
classes, the format constants and the public types. `MIGRATING.md` maps every 1.x name to its
replacement and shows how to convert stored 1.x serialized data. Within the 2.x line semantic
versioning applies: removing or renaming an export is a major.

## Consequences

Smaller surface and declarations; `CHANGELOG.md` lists the removals under Removed rather than
Deprecated. Any 1.x consumer upgrades in one step.

## Verification

`test/types.test-d.ts` and the declarations in `dist/` contain none of the removed names;
`grep -rn "fork\|hydrate\|forAll" src/` is empty apart from `HydrationError`.

## Links

FJ-0007 · [MIGRATING](../../MIGRATING.md)
