# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

A TypeScript rewrite. See [MIGRATING.md](MIGRATING.md) for the upgrade path.

### Added

- Full TypeScript types. The fluent step methods are inferred from the registered validators;
  unknown, misspelled and reserved step names are compile errors.
- `FenceBuilder.create()`, `registerAll(record | builder, options?)`, `step(name, ...args)`,
  `registry`, `entries` and `steps` getters on builders, `registry` and `steps` on fences.
- `FenceBuilder.fromJSON(json, base)` accepts a builder or a plain registry as `base`.
- Compile-time errors that explain themselves for reserved, duplicate and union step names;
  dynamic names widen the builder type (permanently) instead of mistyping existing methods.
- `FORMAT_VERSION` and `NESTED_FENCE_KEY` constants; `SerializedResult` type.
- `Symbol.toStringTag` and Node.js `util.inspect` support on builders, fences and results.
- `Result.toJSON()` is JSON-safe: the subject and non-JSON arguments are described as strings,
  nested fences are tagged.
- Trailing `undefined` step arguments are dropped when recorded.
- Nested results as records (`Record<string, Result>`) in addition to arrays.
- `Result.passed`, `Result.anyPassed`, `Result.for(name)`, `Result.failures()` (flattened, with
  nested paths), `Result.explain()` returning text, `Result.toJSON()`.
- Serialization format 2: one JSON document via `toJSON()`, nested fences tagged with `$fence`,
  `FenceBuilder.fromJSON(json, base)` with shape validation.
- `FenceError` hierarchy: `RegistrationError`, `EmptyFenceError`, `SerializationError`,
  `HydrationError` (with `missing`), `InvalidOutcomeError`.
- Memoization options: `{ memoize: true | { key } }` per registration.
- Runnable, type-checked examples; generated API reference; property-based and differential
  tests.

### Changed

- **Breaking:** `register(name, fn, options)`; the name comes first.
- **Breaking:** builders are immutable. Step methods, `register` and `registerAll` return a new
  builder.
- **Breaking:** `Fence.run(subject)` takes a single subject.
- **Breaking:** ES modules only, Node ≥ 20.19. No CommonJS or UMD builds; `require()` works on
  Node 20.19+/22.12+ and browsers import from an ESM CDN.
- **Breaking:** validators run with `this === undefined`.
- **Breaking:** serializing a non-JSON step argument throws `SerializationError`.
- Memoization caches are per built fence, keyed by SameValueZero or object identity, and cache
  `false` outcomes.
- `explain()` returns a string instead of logging.

### Removed

- **Breaking:** the 1.x API surface that the rewrite replaced: `fork()`, `serialize()`,
  `hydrate()`, `forAll()`, `forAny()`, `forOne()`, the default export and the `Invokable` class.
  No compatibility aliases ship in 2.0; see [MIGRATING.md](MIGRATING.md) for each replacement.
- **Breaking:** the 1.x serialization format is not read. MIGRATING.md shows how to convert a
  stored 1.x blob to the version 2 document.
- **Breaking:** `dememoize()`, the UMD bundle, the `window.fence` global.

### Fixed

- `register()` no longer writes to a shared prototype; registrations cannot leak between
  builders and the prototype chain no longer grows with each `register()`/`fork()`.
- Deriving two builders from one base no longer produces the same object carrying both steps.
- Memoization now caches `false`, distinguishes `1` from `'1'` and objects from each other, and
  no longer returns `Object` for the subject `'constructor'`.
- Errors are `Error` instances with stack traces, not strings.
- Fences nested in step arguments survive serialization and rehydration.
- Serialization is no longer double-encoded.
- Building an empty fence fails early with `EmptyFenceError`.
- `explain()` marks nested and non-boolean outcomes consistently with `passed`.
- The subject is reported as a single value, not an array.

## [1.0.1] - 2021-06-11

Last release of the 1.x line. Maintenance continues on the `v1` branch.
