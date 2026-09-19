# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- 2.0.1 was tagged but never published: CodeQL failed its release pipeline on a finding in the
  repository's documentation generator (`js/incomplete-sanitization`), not in the package. The
  generator now writes the ontology's target patterns into a fenced code block, which shows them
  unchanged, and CodeQL reports nothing (FJ-0022).

### Changed

- CodeQL runs locally as `npm run codeql`, with the CLI pinned in `mise.toml` and the query pack
  pinned in `scripts/codeql.mjs`, the ones CI uses. The pre-push hook runs it on the commit
  being pushed, and CI runs the same command and uploads its results to code scanning. mise
  2026.9.11 or later is required (FJ-0023).
- Releases are pushed in two steps: `main` first, then the tag once CI passes on the release
  commit, so a failing check no longer costs a version (FJ-0025).

## [2.0.1] - 2026-09-19

Tagged but never published to npm: CodeQL failed its release pipeline before the publish step,
and a pushed tag is not moved. 2.0.2 publishes these changes. Besides how the package is built,
checked and released, `Fence.run()` is faster.

### Fixed

- `Fence.run()` had become 2.4–3.3× slower in 2.0.0 than in the first version of the rewrite:
  every run re-validated and re-froze outcomes it had just produced. A result now keeps its
  entries private and freezes the public `outcomes` view once, on first access; `run()` is
  1.7–2.8× faster than the first rewrite, and `outcomes` is still immutable (FJ-0021).
- The release pipeline failed before publishing 2.0.0: `eslint` checked the examples against
  whatever `dist/` happened to exist, so it passed locally and failed in CI. Every check now
  depends only on the tracked tree and the pinned toolchain, and gives the same result locally
  and in CI (FJ-0014).
- The published package's `README.md` links point at the `main` branch (FJ-0017).

### Changed

- Documentation is deployed and the package is published only after every check passes: both
  tested Node lines, the install-by-name consume test, and CodeQL (FJ-0015).
- Development dependencies and GitHub Actions are at their latest releases; TypeScript stays on
  6.0.3, the newest release typescript-eslint and TypeDoc support (FJ-0016).
- The default branch is `main` (FJ-0017).
- Supported Node versions are the ones tested: the current Active LTS (24) and the upcoming LTS
  (26). `engines` is now `^24.0.0 || >=26.0.0`; 2.0.0 declared `>=20.19.0` and was never
  published. The toolchain is managed with mise (FJ-0020).
- The published tarball is the one the checks installed and imported; CodeQL findings now fail
  the checks (FJ-0015).

## [2.0.0] - 2026-09-16

A TypeScript rewrite. See [MIGRATING.md](MIGRATING.md) for the upgrade path.

Tagged but never published to npm: the release pipeline failed before the publish step, and a
pushed tag is not moved. 2.0.2 is the first 2.x release on npm.

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

- `Fence.run()` had become 2.4–3.3× slower in 2.0.0 than in the first version of the rewrite:
  every run re-validated and re-froze outcomes it had just produced. A result now keeps its
  entries private and freezes the public `outcomes` view once, on first access; `run()` is
  1.7–2.8× faster than the first rewrite, and `outcomes` is still immutable (FJ-0021).
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
