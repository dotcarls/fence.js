---
title: Taxonomy — the closed classification sets
doc_type: governance
status: living
---

# Taxonomy

The closed sets a field may take. Each set has one source of truth — a JSON Schema enum, the
gate configuration or the ontology — and the tables here are rendered from it (`generated`
gate; `npm run gates:fix`). Adding a value means editing the source and regenerating. Decided in
[ADR-0007](../adr/ADR-0007-vocabulary-governance.md).

## Work items

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: taxonomy-work-item -->
_From [`tools/schemas/work-item.schema.json`](../../tools/schemas/work-item.schema.json). Generated; run `npm run gates:fix`._

- **`type`**: `epic` · `story` · `task` · `bug` · `spike` · `decision` · `release`
- **`status`**: `backlog` · `ready` · `in-progress` · `blocked` · `review` · `done` · `cancelled`
- **`priority`**: `p0` · `p1` · `p2` · `p3`
<!-- END GENERATED: taxonomy-work-item -->
<!-- prettier-ignore-end -->

Meaning of the values:

- **type** — `epic` (a milestone-sized outcome with child items) · `story` (a user-visible
  capability) · `task` (work with no user-visible surface) · `bug` (a defect against documented
  behavior) · `spike` (time-boxed investigation whose deliverable is knowledge) · `decision`
  (the deliverable is an ADR) · `release` (cutting a version).
- **status** — see the lifecycle in [sdlc](sdlc.md#statuses-and-transitions).
- **priority** — `p0` blocks the milestone · `p1` this milestone · `p2` next · `p3` someday.

## Decision records

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: taxonomy-adr -->
_From [`tools/schemas/adr.schema.json`](../../tools/schemas/adr.schema.json). Generated; run `npm run gates:fix`._

- **`status`**: `proposed` · `accepted` · `rejected` · `deprecated` · `superseded`
<!-- END GENERATED: taxonomy-adr -->
<!-- prettier-ignore-end -->

`proposed` until the owner accepts it; `accepted` records are never edited to say something
different (write a superseding record); `deprecated` when the decision no longer applies and
nothing replaces it.

## Documents

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: taxonomy-doc -->
_From [`tools/schemas/doc.schema.json`](../../tools/schemas/doc.schema.json). Generated; run `npm run gates:fix`._

- **`doc_type`**: `index` · `guide` · `architecture` · `toolchain` · `governance` · `design` · `template` · `release-notes`
- **`status`**: `draft` · `review` · `approved` · `superseded` · `living`
<!-- END GENERATED: taxonomy-doc -->
<!-- prettier-ignore-end -->

`living` documents are kept current in place; `approved` ones are frozen records (a design
record, a release note); `superseded` ones stay for history and name what replaced them.

## Changelog categories

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: taxonomy-changelog -->
| Category | Meaning |
|---|---|
| `Added` | new features |
| `Changed` | changes in existing functionality |
| `Deprecated` | soon-to-be removed features (unused in 2.0, which ships no compatibility surface) |
| `Removed` | features removed in this release |
| `Fixed` | bug fixes |
| `Security` | vulnerability fixes |
<!-- END GENERATED: taxonomy-changelog -->
<!-- prettier-ignore-end -->

## Version change classes

| Class | Semver part | Commit type                                                 | Examples                                                                                             |
| ----- | ----------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| major | X           | `!` or a `BREAKING CHANGE:` footer                          | removing or renaming an export; changing what `fromJSON` accepts; a new serialization format version |
| minor | Y           | `feat`                                                      | a new method, option or export; accepting an input previously refused                                |
| patch | Z           | `fix`, `perf`, `revert`                                     | a fix that makes documented behavior true; performance                                               |
| none  | —           | `docs`, `build`, `ci`, `chore`, `test`, `refactor`, `style` | documentation, dependencies, the toolchain, tests, internal restructuring                            |

The commit type is the classification: the release pipeline derives the version from it
([release-process](release-process.md#what-a-commit-releases)).

## Review finding severities

| Severity | Meaning                                                                           |
| -------- | --------------------------------------------------------------------------------- |
| blocker  | Wrong results, data loss, or a broken published package; release stops            |
| major    | A real defect or an unmet accepted requirement; fixed before the milestone closes |
| minor    | Correct but clearly improvable with a concrete benefit                            |
| nit      | Cosmetic                                                                          |

## Error classes (the library's own taxonomy)

| Class                 | Raised when                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| `RegistrationError`   | A name is reserved, duplicated or not registered; a validator is not a function |
| `EmptyFenceError`     | `build()` on a builder with no steps                                            |
| `SerializationError`  | A step argument is not a JSON value or a fence                                  |
| `HydrationError`      | Serialized input is malformed or names unregistered validators (`missing`)      |
| `InvalidOutcomeError` | A validator returned something other than an outcome                            |
| `TypeError`           | An argument of the wrong JavaScript type to a constructor or `fromJSON`         |

## Test kinds

| Kind           | Where                                 | Proves                                                 |
| -------------- | ------------------------------------- | ------------------------------------------------------ |
| behavior       | `test/*.test.ts`                      | Documented behavior and every invariant                |
| type-level     | `test/types.test-d.ts`                | Inference, and that wrong programs are compile errors  |
| property-based | `test/serialize.test.ts` (fast-check) | Round trips over generated inputs                      |
| differential   | `test/sanity.test.ts`                 | Agreement with validate.js and Joi on shared policies  |
| example        | `examples/*.ts`                       | The documented usage compiles against `dist/` and runs |
| toolchain      | `test/toolchain/*.test.ts`            | Each gate rule fires on a broken fixture               |
| benchmark      | `test/bench/*.bench.ts`               | Informational; asserts nothing                         |

## Annotation kinds

<!-- prettier-ignore-start -->
<!-- BEGIN GENERATED: taxonomy-annotations -->
| Kind | Meaning |
|---|---|
| `@fence:adr` | This construct implements or depends on a decision record; an anchor names the clause. |
| `@fence:item` | This construct is the work tracked by a work item. |
| `@fence:invariant` | This construct establishes or relies on a named invariant from the table below. |
| `@fence:doc` | Reference to a documentation section (the weakest binding; prefer a specific kind). |

A target must match its kind's pattern:

```text
adr        ^ADR-\d{4}(#[a-z0-9-]+)?$
item       ^FJ-\d{4}$
invariant  ^[a-z0-9]+(\.[a-z0-9-]+)+$
doc        ^docs/[A-Za-z0-9/._-]+\.md(#[a-z0-9-]+)?$
```
<!-- END GENERATED: taxonomy-annotations -->
<!-- prettier-ignore-end -->
