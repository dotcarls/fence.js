---
id: ADR-0001
title: "v2 core: an immutable registry-based builder with fluent methods typed from the validators"
status: accepted
date: "2026-09-16"
deciders:
  - Tim Carlson
  - Claude (Fable 5.1)
tags: [core, api, types, immutability]
supersedes: null
superseded_by: null
related: []
---

# ADR-0001 — v2 core: an immutable registry-based builder with fluent methods typed from the validators

## Context

fence.js 1.x recorded validations as data, which was worth keeping, but implemented the builder
by mutating prototypes: `register()` wrote onto `Object.getPrototypeOf(this)` (the class prototype
for a fresh builder, so registrations leaked between unrelated builders), every `register()` or
`fork()` added a prototype level, and step methods mutated the builder in place while `register`
returned copies, so `base.min(4)` and `base.min(8)` were one object carrying both steps. There
were no types. The full assessment is the [design record](../design/2026-09-16-v2-proposal.md).

## Options considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
| Immutable builder: registry as a `Map`, steps as a frozen array, fluent methods attached per instance from a descriptor map cached per registry, the registry carried as a type parameter | Fixes every 1.x defect by construction; typed fluent methods by inference; flat prototype chain | Per-derivation `defineProperties`; a generic type surface to maintain |
| Proxy-based fluent methods | O(1) derivation | A trap on every property access; harder to debug and to type |
| Keep the prototype design, add types | Least code | Types cannot describe methods that appear by mutation; the defects stay |

## Decision

The first option. Commitments:

- **`builder.immutable`** — no operation on a `FenceBuilder` mutates the receiver, its registry,
  its steps or any prototype; `register`, `registerAll`, `step` and every fluent method return a
  new builder. The prototype of every builder is `FenceBuilder.prototype`.
- **Typed by inference.** `register(name, fn)` returns `Fluent<Extend<R, name, typeof fn>>`;
  `ValidatorArgs` takes the parameters after the subject; `step(name, ...args)` is the typed
  primitive the fluent methods delegate to. Reserved, duplicate and union names are compile
  errors whose message is a sentence (`StepName`, `Registrable`, `Mergeable`). A non-literal name
  widens the registry to `Registry`, and a wide registry stays wide.
- **`registry.reserved-names`** — a validator may not be registered under a `FenceBuilder`
  member name, an `Object.prototype` member name, `then`, `prototype` or `__proto__`; checked
  at compile time and at run time (`RegistrationError`).
- **`validator.plain-call`** — a validator is called as a plain function (`this` undefined) with
  the subject then the recorded arguments; trailing `undefined` arguments are dropped when a step
  is recorded; exceptions from validators propagate unchanged; a return value that is not a
  boolean, an array of `Result` or a record of `Result` throws `InvalidOutcomeError`.
- **`memo.per-fence`** — memoization is opted into per registration (`{ memoize: true | { key } }`);
  the cache belongs to the built `Fence`, keys primitives by SameValueZero and objects by
  identity, and caches every outcome including `false`.
- **`result.vacuous-empty`** — `passed` folds nested results with every-semantics and
  `anyPassed` with some-semantics; an empty nested collection is vacuously passed and not
  anyPassed, and `explain()` prints `(no nested results)`. Nested outcomes may be arrays or
  records; record keys and array indices become failure-path segments.
- Errors extend `FenceError` (`RegistrationError`, `EmptyFenceError`, `SerializationError`,
  `HydrationError`, `InvalidOutcomeError`); arguments of the wrong JavaScript type raise
  `TypeError`. `build()` on an empty builder throws `EmptyFenceError`.
- `Fence.run(subject)` takes one subject.

## Consequences

Deriving is free of `fork()` discipline; the type of a builder documents its steps; every 1.x
defect (C1–C12 in the design record) has a regression test. Cost: `register` copies a `Map`
and defines one property per validator on the new builder (cached descriptors), which is not on
the run path.

## Verification

`test/builder.test.ts` (immutability, prototype chain, reserved names), `test/fence.test.ts`
(plain call, memoization, outcomes), `test/result.test.ts` (folding, paths), `test/types.test-d.ts`
(inference, error sentences, widening); the `binding` gate checks that each invariant above is
annotated in `src/`.

## Links

[architecture overview](../architecture/overview.md) · FJ-0001 · FJ-0004
