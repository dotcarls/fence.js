---
title: Toolchain overview
doc_type: toolchain
status: living
---

# The agentic toolchain

The toolchain is a deliverable, not overhead. Its job is to let an agent or a person seed
context cheaply, find exactly the document they need, know what is done and what is next, and be
mechanically prevented from drifting: broken references, stale indexes, unreachable documents,
"done" items without evidence, undeclared vocabulary and misspelled terms all fail a gate rather
than a review. Decided in [ADR-0006](../adr/ADR-0006-agentic-toolchain-and-sdlc.md).

## Pieces

| Piece                                                                    | Where                                                                                            | Doc                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Thin always-loaded entry point                                           | [`CLAUDE.md`](../../CLAUDE.md)                                                                   | [documentation-layout](documentation-layout.md)                         |
| Documentation index (graph root)                                         | [`docs/INDEX.md`](../INDEX.md)                                                                   | [documentation-layout](documentation-layout.md)                         |
| Work tracker (one file per item)                                         | `docs/work/items/`                                                                               | [work-tracking](work-tracking.md), [sdlc](sdlc.md)                      |
| Checkpoint / resume                                                      | [`docs/work/CHECKPOINT.md`](../work/CHECKPOINT.md)                                               | [checkpoint-protocol](checkpoint-protocol.md)                           |
| Decision records                                                         | `docs/adr/`                                                                                      | [ADR-0000](../adr/ADR-0000-adr-process.md)                              |
| Gate tool                                                                | `tools/gates/`, `tools/gates.json`, `tools/schemas/`                                             | [gates](gates.md)                                                       |
| Vocabulary (machine mirrors)                                             | `tools/ontology.json`, `tools/lexicon.json`                                                      | [ontology](ontology.md), [lexicon](lexicon.md), [taxonomy](taxonomy.md) |
| Hooks (on edit, on stop, on session start)                               | [`.claude/settings.json`](../../.claude/settings.json), `tools/hooks/`                           | [agents-and-skills](agents-and-skills.md)                               |
| Git hooks (pre-commit, pre-push)                                         | `package.json` → `simple-git-hooks`, `lint-staged`                                               | [gates](gates.md)                                                       |
| Skills and subagents                                                     | `.claude/skills/`, `.claude/agents/`                                                             | [agents-and-skills](agents-and-skills.md)                               |
| The check chain (CI runs the same command)                               | `npm run check`, `.github/workflows/checks.yml`, `ci.yml`                                        | [environment](environment.md)                                           |
| Release (automated from `main`; publishes only after every check passes) | `release.config.mjs`, `tools/release/`, `commitlint.config.mjs`, `.github/workflows/release.yml` | [release-process](release-process.md)                                   |

## Principles

1. **Progressive disclosure.** `CLAUDE.md` is thin and stable. It points to `INDEX.md`, which
   points to area indexes, which point to documents. An agent reads a little and resolves its
   way to exactly what it needs.
2. **Everything governed is a file with front matter.** Work items, decision records, the
   checkpoint and every document under `docs/` carry YAML front matter validated against JSON
   Schemas in `tools/schemas/`. Machines read the front matter; people read the body.
3. **If a rule cannot be checked mechanically, make it checkable or drop it.** The gate suite
   is the enforcement mechanism. A subsystem added later extends the suite in the same commit.
4. **Fast enough to run on every edit.** The suite runs in well under two seconds on this
   repository and is wired to the Claude Code `PostToolUse` hook and to the git pre-commit hook.
5. **Offline.** No gate touches the network.
6. **Hermetic.** Every target depends only on the tracked tree and the pinned toolchain, so a
   result that differs between a laptop and CI is a defect to fix, not a flake to rerun
   ([ADR-0009](../adr/ADR-0009-hermetic-targets-every-check-depends-only-on-the-tracked-tre.md)).
7. **Vocabulary is data.** The kinds, invariants, classifications and spellings the documents
   use are held in machine files; the human documents render tables from them, so the two
   cannot drift ([ADR-0007](../adr/ADR-0007-vocabulary-governance.md)).

## Daily commands

```bash
npm run gates                 # run every gate; exit 1 on any error
npm run gates:fix             # regenerate generated blocks, then run every gate
npm run work -- new --title "..." [--type task] [--priority p2] [--milestone 2.1.0] [--parent FJ-NNNN]
npm run adr -- new --title "..."
npm run checkpoint            # validate docs/work/CHECKPOINT.md
npm run check                 # the whole CI chain: gates, typecheck, lint, format, tests, build, examples, package checks
```

Editing an item's status, criteria and evidence is done by hand in the item file; the gates keep
it honest.

## What this suite does not check

- **Judgement.** Nothing here grades whether a decision is right, a criterion is meaningful or an
  evidence link proves what it claims. That is what review is for; the `fence-reviewer` agent
  exists to attack exactly those claims.
- **Absence.** Every gate tests a property of something that exists. A change made without a
  work item, or a decision taken without an ADR, is caught by a reader, not a gate.
- **README code blocks.** The `xref` gate resolves links; it does not compile or run examples in
  prose. `examples/` is compiled and run in CI, which is why the README points at it.
