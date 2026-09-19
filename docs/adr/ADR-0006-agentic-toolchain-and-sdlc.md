---
id: ADR-0006
title: 'The documentation graph, work tracking, gates, checkpoint and the agent commit policy'
status: accepted
date: '2026-09-16'
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [process, toolchain, governance, sdlc]
supersedes: null
superseded_by: null
related: []
---

# ADR-0006 — The documentation graph, work tracking, gates, checkpoint and the agent commit policy

## Context

Most of the 2.0 work was done by agents in a single day. It was coordinated through chat and
commit messages, which do not survive a session. The owner asked for an idiomatic way to define,
track and orchestrate work through a simple, standard lifecycle, version controlled and aligned
with agentic development practice, with the toolchain and architecture documented under the same
governance. The reference was a larger project whose toolchain (index, tracker, gates, hooks,
checkpoint, ADRs) had proven itself; this repository is much smaller, so the shape is kept and
the scale reduced.

## Options considered

| Option                                                                                          | Pros                                                                           | Cons                                                                    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| In-repository, file-per-artifact governance with a TypeScript gate tool, hooks and a checkpoint | Versioned with the code; offline; checkable on every edit; no external tracker | The tool is ours to maintain                                            |
| GitHub Issues + Projects                                                                        | Familiar UI                                                                    | Off-repository; agents need network and credentials; not gate-checkable |
| Conventions only, no tooling                                                                    | No code                                                                        | Drift is found by readers, late                                         |

## Decision

The first option, as documented in [docs/toolchain/](../toolchain/README.md):

- **Documentation graph.** `CLAUDE.md` (thin) → `docs/INDEX.md` → area indexes → documents; every
  governed document has front matter and is reachable from the index.
- **Work items** (`FJ-NNNN`) with acceptance criteria and evidence; **milestones** are release
  versions; the lifecycle is `backlog → ready → in-progress → review → done` with `blocked` and
  `cancelled` ([sdlc](../toolchain/sdlc.md)).
- **Decision records** per ADR-0000.
- **Gates** (`npm run gates`): schemas, xref, work-items, checkpoint, reachability, generated,
  binding, lexicon, changelog; run on every edit (Claude hook), every commit (git hook) and in
  CI; never bypassed.
- **Checkpoint** (`docs/work/CHECKPOINT.md`) written before every session ends; the `Stop`
  hook enforces freshness.
- **Agents commit locally** at coherent boundaries with the check chain green and the co-author
  trailer; they never push, publish or rewrite shared history. At most three subagents at a
  time. Skills `/gates`, `/checkpoint`, `/release`; agent definitions implementer, scribe,
  reviewer.

## Consequences

Every change is traceable from item to decision to code to test; a new session resumes from the
checkpoint without re-deriving; drift fails fast. Cost: writing items and records, and a small
tool (`tools/gates/`) with its own tests.

## Verification

The gate suite passes on the tree; `test/toolchain/gates.test.ts` shows each rule firing on a
broken fixture; this record, its items and its documents are themselves the first governed
artifacts.

## Links

[gates](../toolchain/gates.md) · [work-tracking](../toolchain/work-tracking.md) ·
[checkpoint-protocol](../toolchain/checkpoint-protocol.md) · [agents-and-skills](../toolchain/agents-and-skills.md) · FJ-0008
