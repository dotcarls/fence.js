# fence.js — agent entry point

Composable, portable validations for TypeScript/JavaScript: an immutable builder records named
steps, builds fences, runs them, serializes them to JSON. Zero dependencies, ESM only.

**This file is deliberately thin.** It is loaded every session; everything else is one hop away.

## Read first, every session

1. [docs/work/CHECKPOINT.md](docs/work/CHECKPOINT.md) — the milestone, what is done, what is in
   progress, the exact next action. Refresh it before ending a session (`/checkpoint`).
2. [docs/INDEX.md](docs/INDEX.md) — the documentation index. Resolve from there; never guess paths.
3. [docs/toolchain/README.md](docs/toolchain/README.md) — how this repository's agentic toolchain
   works: gates, work items, checkpoint, hooks, skills, agents.

## Standing rules

- **Gates are not optional.** `npm run gates` runs on every edit (hook) and every commit (git
  hook) and fails with each finding named. Never bypass a failing gate; fix the artifact or change
  the rule deliberately. `npm run check` is the whole CI chain, run before any commit that
  touches `src/`, `test/`, `examples/` or the toolchain; `npm run codeql` is CI's CodeQL job,
  run before a push (the pre-push hook runs both on a clean export).
- **Work is tracked.** Every change beyond a typo has a work item in `docs/work/items/`
  (`npm run work -- new --title "..."`), with acceptance criteria written before the work starts.
  Done means every criterion satisfied with an evidence link that resolves.
- **Decisions are recorded.** Architecture, API surface, toolchain and process choices go in an
  ADR (`npm run adr -- new --title "..."`) before or with the change. Code that implements a
  decision or establishes an invariant is annotated `@fence:adr(...)` / `@fence:invariant(...)`
  from the [ontology](docs/toolchain/ontology.md).
- **Vocabulary is governed.** American English; the canonical terms are in the
  [lexicon](docs/toolchain/lexicon.md), classifications in the [taxonomy](docs/toolchain/taxonomy.md),
  artifact kinds in the [metamodel](docs/toolchain/metamodel.md).
- **Targets are hermetic.** The toolchain is mise: `mise install`, then run npm under it
  (`mise exec -- npm …` or an activated shell); npm refuses other Node versions. Every
  target depends only on the tracked tree and that toolchain, and CI runs the same
  `npm run check`; a result that differs between here and CI is a defect
  ([ADR-0009](docs/adr/ADR-0009-hermetic-targets-every-check-depends-only-on-the-tracked-tre.md),
  [ADR-0011](docs/adr/ADR-0011-mise-manages-the-toolchain-the-active-lts-node-is-the-defaul.md)).
- **Commits are local and conventional.** Commit at coherent boundaries with the check chain
  green, a [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) message (the
  `commit-msg` hook enforces it; the type decides the release) and the co-author trailer; never
  push, never tag, never publish, never rewrite shared history. A push to `main` releases
  automatically, so pushing is the owner's act
  ([release process](docs/toolchain/release-process.md)).
- **Small agent pools.** At most three subagents at a time (owner's preference, 2026-09-16):
  one implementer or scribe plus one reviewer, or two reviewers with distinct mandates.
  Route by [agents-and-skills](docs/toolchain/agents-and-skills.md).
- **Report plainly.** Failures with their output; skipped steps named; nothing described as
  verified that was not run. A finding a check did not make is not evidence of absence.
- **Compatibility is not owed inside a major version's rewrite.** 2.0 ships no 1.x aliases
  ([ADR-0005](docs/adr/ADR-0005-no-compatibility-surface-in-2-0.md)); within 2.x, semver applies.
