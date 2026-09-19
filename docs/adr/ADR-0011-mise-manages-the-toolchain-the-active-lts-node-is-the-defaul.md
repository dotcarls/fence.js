---
id: ADR-0011
title: 'mise manages the toolchain; the Active LTS Node is the default and the upcoming LTS the only other line tested'
status: accepted
date: 2026-09-19
deciders:
  - Tim Carlson
  - Claude (Opus 5)
tags: [toolchain, ci, node, mise]
supersedes: null
superseded_by: null
related:
  - mise.toml
  - docs/toolchain/environment.md
---

# ADR-0011 — mise manages the toolchain; the Active LTS Node is the default and the upcoming LTS the only other line tested

## Context

ADR-0009 pinned Node in `.nvmrc` and tested three lines in CI (22, 24, 26) plus the `engines`
floors (20.19, 22.12) for consumers. The owner directed: **use mise by default; the current LTS
Node is the default version, and the only other version(s) tested are upcoming LTS
release(s).** On 2026-09-19 the Node release schedule
(<https://github.com/nodejs/Release/blob/main/schedule.json>, retrieved 2026-09-19) has Node 24
in Active LTS (maintenance from 2026-10-20), Node 26 released 2026-05-05 and entering LTS on
2026-10-28, Node 22 in maintenance, and Node 20 end-of-life since 2026-04-30.

## Options considered

| Option                                                                                                                                                            | Pros                                                                                                                                           | Cons                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `mise.toml` pins the toolchain; mise installs it locally and in CI (`jdx/mise-action`); the upcoming LTS is tested by overriding the pin with `MISE_NODE_VERSION` | One pin read by every environment; one tool whether a contributor or CI installs; the override is an environment variable anyone can reproduce | Contributors need mise                                                                                   |
| Keep `.nvmrc` and `actions/setup-node`                                                                                                                            | No new tool                                                                                                                                    | Two mechanisms: version managers read `.nvmrc`, CI reads it through setup-node; the owner asked for mise |
| Keep testing maintenance lines (22) and the `engines` floors (20.19, 22.12)                                                                                       | Wider support claim                                                                                                                            | Contrary to the direction; 20 is end-of-life                                                             |

## Decision

1. **`mise.toml` is the single toolchain pin.** It pins Node exactly to the current Active LTS
   release (24.21.0) and sets `min_version` (hard: the oldest mise verified, 2026.6.14; soft:
   the mise release CI pins, 2026.9.11). `.nvmrc` is removed. Contributors run `mise install`;
   `mise activate` or `mise exec --` puts the pinned Node first.
2. **CI installs the toolchain with mise** (`jdx/mise-action`, pinned by SHA, mise version
   pinned) in every job, restoring no cache in the job that publishes.
3. **Two Node lines are tested, no others:** the Active LTS from `mise.toml`, and the upcoming
   LTS line (26.9.0) by setting `MISE_NODE_VERSION` on the second leg of `check` and `consume`.
   The same leg runs locally with `MISE_NODE_VERSION=26.9.0 mise exec -- npm run check`.
4. **Support claims follow what is tested.** `engines.node` is `^24.0.0 || >=26.0.0` (was
   `>=20.19.0`): the Active LTS line and the upcoming LTS line onward, excluding Node 25, which
   will never be LTS. Each line is tested at its latest release, as Node recommends running;
   `devEngines` is `^24.15.0 || >=26.0.0` (the Node 24 floor is release-it's). The browser
   support in ADR-0002 is unaffected.
5. **The pin moves with the schedule.** When the upcoming LTS enters Active LTS (Node 26 on
   2026-10-28), it becomes the `mise.toml` pin and the next even-numbered release, once
   published, becomes the tested upcoming LTS; `engines` rises to the new default line in the
   next major release. Patch releases within a pinned line are adopted by editing `mise.toml`
   and the override in `checks.yml`.
6. **Hooks find Node through mise** (`mise which node` from the project), never installing
   anything; a missing toolchain is reported with `mise trust && mise install`.

## Consequences

Contributors need mise. `devEngines` refuses Node 22 locally as well as in CI. Consumers on
Node 20 or 22 are outside the declared support of 2.x; no 2.x release has been published yet,
so no installed 2.x user loses support. Every future LTS transition is a small, documented edit
rather than a decision.

## Verification

Fresh copies of the tree checked by `mise exec -- npm run check` on both lines (recorded in
FJ-0020); the hooks resolve Node 24.21.0 through mise while the shell's default Node is
22.15.0; actionlint reports no findings.

## Links

FJ-0020 · ADR-0009 · ADR-0010 · ADR-0002 · [environment](../toolchain/environment.md)

## Amendment A1 — 2026-09-19: the devEngines floor

release-it is gone (ADR-0013). The Node 24 floor in `devEngines` is now semantic-release's,
`^24.10.0 || >=26.0.0`.
