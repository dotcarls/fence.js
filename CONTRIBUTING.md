# Contributing to fence.js

Thanks for helping out. Issues and pull requests are welcome; small, focused changes with a
test are the fastest to review.

## Where things are decided and tracked

The [documentation index](docs/INDEX.md) is the root: architecture in `docs/architecture/`,
decisions in `docs/adr/`, work items in `docs/work/items/`, and how all of it is governed in
`docs/toolchain/` (start with [the lifecycle](docs/toolchain/sdlc.md)). Every change beyond a typo
has a work item; decisions have an ADR; `npm run gates` checks the graph on every commit.

## Setup

fence.js has no runtime dependencies. The toolchain is managed by **[mise](https://mise.jdx.dev)**:
`mise.toml` pins Node to the current Active LTS release, and npm refuses other versions through
`devEngines` ([environment](docs/toolchain/environment.md)). The published package runs on
Node 24+ and evergreen browsers.

```sh
git clone https://github.com/<you>/fence.js.git
cd fence.js
mise trust && mise install    # the pinned Node and CodeQL (2.7 GB on macOS; needs mise ≥ 2026.9.11)
mise exec -- npm install      # also installs the git hooks (simple-git-hooks)
mise exec -- npm run check    # everything CI runs, in the same order
```

With `mise activate` in your shell, drop the `mise exec --` prefix. CI also runs the upcoming
LTS line; run it locally with `MISE_NODE_VERSION=26.9.0 mise exec -- npm run check`.

## Scripts

| Script                    | What it does                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npm test`                | Runs the Vitest suite once, type-level tests included (`npm run test:watch` to watch)                               |
| `npm run test:coverage`   | Same, with v8 coverage; thresholds are 95% across the board                                                         |
| `npm run typecheck`       | `tsc --noEmit` over `src` and `test`                                                                                |
| `npm run lint`            | ESLint with `typescript-eslint` strict, type-checked rules                                                          |
| `npm run format`          | Prettier (`format:check` only verifies)                                                                             |
| `npm run build`           | Compiles `src` to `dist` (ESM + `.d.ts`) with `tsc`                                                                 |
| `npm run examples`        | Builds `dist/`, then type-checks and runs every example in `examples/` against the built package                    |
| `npm run check:package`   | `publint` and `@arethetypeswrong/cli` against the packed tarball                                                    |
| `npm run bench`           | Compares fence.js with validate.js and Joi (informational)                                                          |
| `npm run docs`            | Generates the API reference into `docs/` with TypeDoc                                                               |
| `npm run verify:install`  | Fails when `node_modules` differs from `package-lock.json` (run `npm ci`); first step of `check`                    |
| `npm run codeql`          | CodeQL with the CLI and queries CI uses, over the files a commit would contain; fails on any finding                |
| `npm run check:clean`     | `npm run check` and `npm run codeql` on the HEAD commit in a clean export with `npm ci`; the pre-push hook runs it  |
| `npm run check`           | Everything CI runs, in the same order                                                                               |
| `npm run commitlint`      | Checks commit messages, e.g. `npm run commitlint -- --from origin/main`; the commit-msg hook runs it on each commit |
| `npm run release:dry-run` | What the commits since the last release would release; tags and publishes nothing                                   |

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
examples/       runnable usage examples; they import `fence.js` by name (src/ for editors and lint,
                the built dist/ under `npm run examples`)
scripts/        release helpers
tools/          gate tool (tools/gates/), schemas, ontology and lexicon files, Claude Code hooks
docs/           the documentation graph: index, toolchain and governance, decisions, work items
.claude/        hooks configuration, skills, subagent definitions
```

## Conventions

- TypeScript strict mode with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and
  `erasableSyntaxOnly`; relative imports use the `.js` extension.
- Public API changes need: a behavior test, a type test when types are involved, a doc comment
  on the exported symbol, and a commit message that says what changed for users: it becomes the
  release note.
- Errors the library raises about validation input or state are subclasses of `FenceError`;
  `TypeError` is reserved for arguments of the wrong JavaScript type (constructors, the `base`
  argument of `fromJSON`).
- Prettier, ESLint and the related Vitest files run on staged files in the pre-commit hook; the
  pre-push hook runs `npm run check:clean`, the whole chain and CodeQL on the commit being pushed.

## Commit messages

Every commit is a [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/):
`type(optional scope): subject`, then an optional body and footers. The `commit-msg` hook refuses
anything else, and CI checks every commit of a pull request and its title, because a squash
merge writes the title as the commit. The type decides the release:

| Type                                                        | Release | Use for                                                      |
| ----------------------------------------------------------- | ------- | ------------------------------------------------------------ |
| `feat`                                                      | minor   | a new capability for users of the package                    |
| `fix`, `perf`, `revert`                                     | patch   | a bug fix, a speedup, undoing an earlier commit              |
| `!` after the type, or a `BREAKING CHANGE:` footer          | major   | anything that can break a correct consumer                   |
| `docs`, `test`, `refactor`, `style`, `build`, `ci`, `chore` | none    | documentation, tests, internals, dependencies, the toolchain |

The subject is the release note, so write it for users of the package, and name the work item
(`fix: explain() names the failing step (FJ-0042)`).

## Releasing

There is nothing to do by hand. Every push to `main` whose commits warrant a release is tagged
as a release candidate (`vX.Y.Z-rc.N`), checked, and, once every check passes, published to npm
with provenance, tagged `vX.Y.Z` and announced as a GitHub release with notes generated from the
commits ([release process](docs/toolchain/release-process.md)). `npm run release:dry-run` shows
what the next release would be.
