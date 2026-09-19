---
id: ADR-0007
title: 'Vocabulary governance: metamodel, ontology, taxonomy and lexicon as data'
status: accepted
date: '2026-09-16'
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [governance, vocabulary, ontology]
supersedes: null
superseded_by: null
related: []
---

# ADR-0007 — Vocabulary governance: metamodel, ontology, taxonomy and lexicon as data

## Context

The project had three vocabularies in use at once: the 1.x one (fork, hydrate, invokable,
validation), the 2.0 one (derive, restore, step, fence) and British and American spellings mixed
across documents. The owner asked for a canonical metamodel, ontology, taxonomy and lexicon.

## Options considered

| Option                                                                                                                                                                                         | Pros                                                                   | Cons                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Four documents, each with a machine mirror where enforcement is possible (ontology and lexicon JSON, schema enums), tables rendered from the mirrors, gates enforcing spelling and annotations | Cannot drift; enforceable where it matters; readable where it does not | Two places to edit for a governed term (the JSON and, for prose, the document) |
| Prose glossary only                                                                                                                                                                            | Easy                                                                   | Nothing checks it                                                              |

## Decision

- **[Metamodel](../toolchain/metamodel.md)** — the kinds of governed artifact (work item, ADR,
  checkpoint, document, milestone, source construct, invariant, test, vocabulary file), their
  identities, schemas and the relations the gates check.
- **[Ontology](../toolchain/ontology.md)** — the domain concepts (validator, registry, builder,
  step, fence, subject, outcome, result, failure path, nested fence, wide registry, memoization
  key, serialized fence, restore) and the binding vocabulary `@fence:<kind>(<target>)` with kinds
  `adr`, `item`, `invariant`, `doc` and the named invariants, mirrored in `tools/ontology.json`.
- **[Taxonomy](../toolchain/taxonomy.md)** — the closed sets: item types, statuses, priorities,
  ADR statuses, document types and statuses, changelog categories, version change classes,
  review severities, error classes, test kinds; rendered from the schemas and the gate
  configuration.
- **[Lexicon](../toolchain/lexicon.md)** — canonical terms with what not to say, **American
  English** spelling enforced by the `lexicon` gate from `tools/lexicon.json`, and the writing
  register.
- Adding a term means editing the machine file and running `npm run gates:fix`; the `generated`
  gate refuses a hand-edited table.

## Consequences

One vocabulary in code, documents and conversation; a misspelling or an undeclared annotation
kind is a gate error. Cost: a second file to edit for governed terms.

## Verification

Gates `generated`, `binding`, `lexicon`; the `schemas` gate for the enums.

## Links

FJ-0008 · ADR-0006
