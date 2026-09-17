# Contributing to fence.js

Thanks for helping out. Issues and pull requests are welcome; small, focused changes with a
test are the fastest to review.

## Setup

fence.js has no runtime dependencies. Developing it needs **Node.js 22 (LTS) or 24** (see
`.nvmrc`; the published package itself runs on Node 20.19+ and evergreen browsers) and npm.

```sh
git clone https://github.com/<you>/fence.js.git
cd fence.js
npm install      # also installs the git hooks (simple-git-hooks)
npm run check    # everything CI runs, in the same order
```

## Scripts

| Script                       | What it does                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `npm test`                   | Runs the Vitest suite once, type-level tests included (`npm run test:watch` to watch) |
| `npm run test:coverage`      | Same, with v8 coverage; thresholds are 95% across the board                           |
| `npm run typecheck`          | `tsc --noEmit` over `src` and `test`                                                  |
| `npm run lint`               | ESLint with `typescript-eslint` strict, type-checked rules                            |
| `npm run format`             | Prettier (`format:check` only verifies)                                               |
| `npm run build`              | Compiles `src` to `dist` (ESM + `.d.ts`) with `tsc`                                   |
| `npm run typecheck:examples` | Type-checks `examples/` against the built package's declarations (run `build` first)  |
| `npm run examples`           | Runs every example in `examples/` against the built package (`dist/`)                 |
| `npm run check:package`      | `publint` and `@arethetypeswrong/cli` against the packed tarball                      |
| `npm run bench`              | Compares fence.js with validate.js and Joi (informational)                            |
| `npm run docs`               | Generates the API reference into `docs/` with TypeDoc                                 |
| `npm run check`              | Everything CI runs, in the same order                                                 |

## Layout

```
src/
  index.ts      public surface
  builder.ts    FenceBuilder: immutable registry + recorded steps, fluent methods
  fence.ts      Fence: bound steps, run()
  result.ts     Result: verdicts, failures(), explain(), toJSON()
  step.ts       step records, validator binding, memoization, registry view
  serialize.ts  format v2 (de)serialization and the v1 importer
  errors.ts     FenceError hierarchy
  format.ts     value formatting for messages
  types.ts      public types
test/
  *.test.ts        behavior tests (Vitest)
  types.test-d.ts  type-level tests (expectTypeOf; run by `npm test` via vitest's typecheck mode)
  support/         validators shared by the tests and the benchmark
  bench/           tinybench comparison
examples/       runnable usage examples; they import `fence.js` by name, so they exercise dist/
scripts/        release helpers
```

## Conventions

- TypeScript strict mode with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and
  `erasableSyntaxOnly`; relative imports use the `.js` extension.
- Public API changes need: a behavior test, a type test when types are involved, an entry in
  `CHANGELOG.md` (hand-maintained, Keep a Changelog format) under the upcoming version, and a
  doc comment on the exported symbol.
- Errors the library raises about validation input or state are subclasses of `FenceError`;
  `TypeError` is reserved for arguments of the wrong JavaScript type (constructors, the `base`
  argument of `fromJSON`).
- Prettier, ESLint and the related Vitest files run on staged files in the pre-commit hook;
  `typecheck` and the full test suite run before push.

## Releasing

Maintainers release from `master`: add the `## [X.Y.Z] - YYYY-MM-DD` section to
`CHANGELOG.md`, then run `npm run release`, which runs the full check, bumps the version,
verifies the changelog section exists, commits, tags `vX.Y.Z` and pushes. Pushing the tag
triggers `.github/workflows/release.yml`, which publishes to npm with provenance (npm trusted
publishing, no token) under `latest`, or `next` for prereleases, and creates the GitHub
release with that changelog section as its notes.
