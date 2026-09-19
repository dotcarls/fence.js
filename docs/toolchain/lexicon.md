---
title: Lexicon — terms and spelling
doc_type: governance
status: living
---

# Lexicon

The words this project uses, in the form it uses them. The domain terms are defined in the
[ontology](ontology.md); this document fixes **which word** and **how it is spelled**. The
spelling table is rendered from [`tools/lexicon.json`](../../tools/lexicon.json) and enforced by
the `lexicon` gate over governed Markdown and source comments. Decided in
[ADR-0007](../adr/ADR-0007-vocabulary-governance.md).

## Canonical terms

| Term                    | Use it for                                                                  | Not                                                           |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| fence                   | a built, runnable validation (`Fence`)                                      | validation, chain, rule set                                   |
| builder                 | the immutable composer (`FenceBuilder`)                                     | factory, chain                                                |
| validator               | an application function registered under a name                             | rule, check, predicate                                        |
| step                    | one recorded `(name, args)` pair                                            | invokable, call, rule                                         |
| register / registration | adding a validator to a registry                                            | define, add, install                                          |
| derive                  | making a new builder from an existing one by registering or recording steps | fork, extend, clone, copy                                     |
| run                     | applying a fence to a subject                                               | validate, execute, check                                      |
| subject                 | the value a fence is run against                                            | input, value, target                                          |
| outcome                 | what one validator returns for one subject                                  | result (reserved for `Result`)                                |
| result                  | the `Result` object: all outcomes for one run                               | report, verdict                                               |
| passed / failed         | a verdict on a step, an outcome or a result                                 | valid / invalid, ok / error, green                            |
| nested result           | a `Result` inside an outcome, from a higher-order validator                 | sub-result, child                                             |
| failure path            | the step names and keys leading to a failed step                            | error path, breadcrumb                                        |
| serialize / restore     | `toJSON()` / `fromJSON()`                                                   | dehydrate / hydrate (only in `HydrationError`), persist, load |
| serialized fence        | the `{ fence: 2, steps }` document                                          | blob, payload, wire format                                    |
| nested fence            | a fence held in a step argument; `$fence`-tagged when serialized            | sub-fence, child fence                                        |
| wide registry           | a registry whose names are not statically known                             | dynamic registry, loose registry                              |
| memoize                 | cache outcomes per subject on a built fence                                 | cache (as a verb), remember                                   |
| reserved name           | a name that may not be a validator name                                     | forbidden, blocked                                            |
| work item               | the unit of tracked change (`FJ-NNNN`)                                      | ticket, issue, task (task is a type)                          |
| decision record         | an ADR                                                                      | RFC, design doc (design records are historical)               |
| milestone               | the release a set of items ships in                                         | sprint, phase, epic (epic is a type)                          |
| gate                    | one mechanical check in the suite                                           | lint, rule, validator                                         |
| checkpoint              | the session hand-off document                                               | status, handover, notes                                       |
| evidence                | the link that proves a criterion                                            | proof, reference                                              |
| owner                   | Tim Carlson, who approves and publishes                                     | user, maintainer (maintainer is fine for the role in README)  |
| agent                   | a Claude Code session or subagent acting in the repository                  | bot, assistant                                                |

## Spelling

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: lexicon-spelling -->
_American English. Generated from [`tools/lexicon.json`](../../tools/lexicon.json); the `lexicon` gate enforces it._

| Avoid | Use | Note |
|---|---|---|
| behaviour | behavior |  |
| behaviours | behaviors |  |
| artefact | artifact |  |
| artefacts | artifacts |  |
| serialise | serialize |  |
| serialised | serialized |  |
| serialisation | serialization |  |
| deserialise | deserialize |  |
| initialise | initialize |  |
| normalise | normalize |  |
| recognise | recognize |  |
| organise | organize |  |
| colour | color |  |
| honour | honor |  |
| favour | favor |  |
| centre | center |  |
| licence | license |  |
| catalogue | catalog |  |
| cancelled | cancelled | exception: the work-item status keeps the double l because it is an enum value |
<!-- END GENERATED: lexicon-spelling -->
<!-- prettier-ignore-end -->

Rules that the table cannot hold:

- Code identifiers are never respelled; a rule applies to prose and comments.
- Quoted third-party names keep their own spelling (`Keep a Changelog`, `typescript-eslint`).
- `fence.js` is written lowercase with the dot, including at the start of a sentence.

## Terms to avoid

Words that carried 1.x meanings or that blur a distinction the ontology makes. Not enforced by
a gate (a migration guide has to name the old API); reviewers flag them.

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: lexicon-terms -->
| Avoid | Use | Why |
|---|---|---|
| fork | derive | fork() was the 1.x mutable-prototype mechanism; builders are values now |
| hydrate | restore (fromJSON) | the 2.0 API is fromJSON; hydration survives only in HydrationError, the error class name |
| invokable | step | 1.x class name |
| validation (for a built fence) | fence | a validation is what a validator performs; the composed artifact is a fence |
<!-- END GENERATED: lexicon-terms -->
<!-- prettier-ignore-end -->

## Writing register

Documents are written for a competent engineer who has not read the code: state the fact, then
the reason; one idea per sentence; name the file only when the reader has to open it; numbers in
tables. Agent-facing documents (this area) may be terser than the README, never vaguer.
