---
id: ADR-0000
title: 'ADR format and process'
status: accepted
date: '2026-09-16'
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [process, toolchain]
supersedes: null
superseded_by: null
related: []
---

# ADR-0000 — ADR format and process

## Context

Decisions about the library and about how the repository works were, until 2.0, spread over a
proposal document, commit messages and chat. They need a home that is reviewable, linkable from
work items and code, and mechanically indexed, or they are re-litigated.

## Options considered

| Option                                                                                          | Pros                                                                                                 | Cons                                        |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Nygard-style ADRs with an options table (MADR flavored), YAML front matter, one file per record | Boring, universal, greppable, diffable; front matter enables schema validation and a generated index | Writing discipline                          |
| Decisions inline in the proposal or README                                                      | No new files                                                                                         | Not addressable; edits erase history        |
| GitHub Discussions / issues                                                                     | Familiar                                                                                             | Off-repository; not versioned with the code |

## Decision

One file per record at `docs/adr/ADR-NNNN-<slug>.md`, front matter validated by
[`adr.schema.json`](../../tools/schemas/adr.schema.json), body sections Context, Options
considered, Decision, Consequences, Verification, Links; the index in [README](README.md) is
generated.

- Statuses: `proposed` → `accepted` | `rejected`; later `deprecated` or `superseded` (the successor
  sets `supersedes`, the predecessor `superseded_by`). An accepted record is never edited to say
  something different; a dated **Amendment** section may add a case it did not cover.
- Numbers other documents or code rely on are stated in the record, not only in code.
- Code that implements a decision carries `@fence:adr(ADR-NNNN#section)`
  ([ontology](../toolchain/ontology.md)); work items link the records that constrain them.
- The owner accepts records; the coordinating session may propose and, for decisions the owner
  has already taken in conversation, record them as `accepted` naming the owner as decider.

## Consequences

Decisions become addressable artifacts with a mechanical index; the `xref`, `schemas`,
`reachability` and `binding` gates keep them linked. Cost: writing.

## Verification

Gates `schemas` (front matter and required sections), `xref`, `reachability`, `generated`,
`binding`.

## Links

[docs/toolchain/README.md](../toolchain/README.md)
