# Contributing to fence.js

Thanks for helping out. Issues and pull requests are welcome; small, focused changes with a
test are the fastest to review.

## Setup

fence.js has no runtime dependencies. Developing it needs **Node.js 22.12 or newer** (the
published package itself runs on Node 20.19+ and evergreen browsers) and npm.

```sh
git clone https://github.com/<you>/fence.js.git
cd fence.js
npm install      # also installs the git hooks (simple-git-hooks)
npm run check    # typecheck, lint, format, tests with coverage, build, package checks
```

## Scripts

| Script                  | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `npm test`              | Runs the Vitest suite once (`npm run test:watch` to watch)       |
| `npm run test:coverage` | Same, with v8 coverage; thresholds are 95% across the board      |
| `npm run typecheck`     | `tsc --noEmit` over `src`, `test` and `examples`                 |
| `npm run lint`          | ESLint with `typescript-eslint` strict, type-checked rules       |
| `npm run format`        | Prettier (`format:check` only verifies)                          |
| `npm run build`         | Compiles `src` to `dist` (ESM + `.d.ts`) with `tsc`              |
| `npm run check:package` | `publint` and `@arethetypeswrong/cli` against the packed tarball |
| `npm run examples`      | Runs every example in `examples/` against the built package      |
| `npm run bench`         | Compares fence.js with validate.js and Joi (informational)       |
| `npm run docs`          | Generates the API reference into `docs/` with TypeDoc            |
| `npm run check`         | Everything CI runs, in order                                     |

## Layout

```
src/
  index.ts      public surface
  builder.ts    FenceBuilder: immutable registry + recorded steps, fluent methods
  fence.ts      Fence: bound steps, run()
  result.ts     Result: verdicts, failures(), explain()
  step.ts       step records, validator binding, memoization
  serialize.ts  format v2 (de)serialization and the v1 importer
  errors.ts     FenceError hierarchy
  format.ts     value formatting for messages
  types.ts      public types
test/
  *.test.ts     behaviour tests (Vitest)
  types.test-d.ts  type-level tests (vitest --typecheck, expectTypeOf)
  support/      validators shared by tests, examples and benchmarks
  bench/        tinybench comparison
examples/       runnable, type-checked usage examples
```

## Conventions

- TypeScript strict mode with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and
  `erasableSyntaxOnly`; relative imports use the `.js` extension.
- Public API changes need: a behaviour test, a type test when types are involved, a note in
  `CHANGELOG.md` under "Unreleased", and a doc comment on the exported symbol.
- Errors thrown by the library are subclasses of `FenceError`.
- Prettier and ESLint run on staged files in the pre-commit hook; `typecheck` and the test
  suite run before push.

## Releasing

Maintainers release from `master` with `npm run release`, which runs the full check, bumps
the version, updates `CHANGELOG.md`, commits, tags `vX.Y.Z` and pushes. Pushing the tag
triggers `.github/workflows/release.yml`, which publishes to npm with provenance (npm
trusted publishing, no token) and creates the GitHub release.
