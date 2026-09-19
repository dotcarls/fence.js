---
title: The gate suite
doc_type: toolchain
status: living
---

# The gate suite (`npm run gates`)

Nine offline checks over the governed files, implemented in
[`tools/gates/`](../../tools/gates/cli.ts) and configured by
[`tools/gates.json`](../../tools/gates.json). Every finding names its gate, its file and the
edit that resolves it; any `error` fails the run. `--fix` repairs what can be repaired
mechanically (generated blocks). Wired to the Claude Code `PostToolUse` hook (every edit), the
git pre-commit hook and the CI chain.

## Gates

| Gate           | Checks                                                                                                                                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemas`      | Front matter validates against the schema mapped by path (work items, ADRs, the checkpoint, every other document under `docs/`); the required `##` sections exist.                                                                                                                  |
| `xref`         | Every relative Markdown link resolves, `#anchor` included (GitHub slug rules); every bare `FJ-NNNN` / `ADR-NNNN` token resolves to a file. Code blocks are ignored. External URLs are not fetched.                                                                                  |
| `work-items`   | Tracker semantics: file name matches id, relations exist and are symmetric, blocked items say why, **done ⇒ every criterion satisfied with resolving evidence** and no open blocker, in-progress ⇒ named in the checkpoint, links resolve.                                          |
| `checkpoint`   | The resume pointer is true: `in_progress_items` ↔ items that are `in-progress` (both directions), `next_action` names an open item while any is in progress and never a closed one, `updated` is not in the future.                                                                 |
| `reachability` | Breadth-first search from `CLAUDE.md` and `docs/INDEX.md` over resolved links and ids reaches every `docs/**/*.md`, the package documents, and every Markdown file under `.claude/` and `tools/`.                                                                                   |
| `generated`    | Every generated block equals a fresh render (work index, ADR index, ontology tables, taxonomy tables, lexicon tables) and sits inside `<!-- prettier-ignore-start -->` … `<!-- prettier-ignore-end -->`, so Prettier never rewrites what the generator owns. `--fix` rewrites them. |
| `binding`      | Every `@fence:<kind>(target)` annotation in `src/` uses a kind from [`tools/ontology.json`](../../tools/ontology.json), matches its target pattern and resolves; every invariant's `defined_in` resolves; an invariant no source file annotates is a warning.                       |
| `lexicon`      | Governed Markdown and source files contain none of the spelling variants in [`tools/lexicon.json`](../../tools/lexicon.json).                                                                                                                                                       |
| `changelog`    | `CHANGELOG.md` follows Keep a Changelog: `## [Unreleased]` or `## [x.y.z] - YYYY-MM-DD` headings, versions descending, only the six categories, and a section for the package version (or its base version for a prerelease, or an `[Unreleased]` section).                         |

## Schemas

| Files                                           | Schema                   | Required sections                                   |
| ----------------------------------------------- | ------------------------ | --------------------------------------------------- |
| `docs/work/items/FJ-*.md`                       | `work-item.schema.json`  | Description                                         |
| `docs/adr/ADR-*.md`                             | `adr.schema.json`        | Context, Decision, Consequences                     |
| `docs/work/CHECKPOINT.md`                       | `checkpoint.schema.json` | Now, Done, In progress, Next action, Open questions |
| every other `docs/**/*.md` (templates excluded) | `doc.schema.json`        | —                                                   |

## Fixing findings

- Fix the artifact, never the rule, unless the rule is wrong; then change `tools/gates.json`,
  a schema, `tools/ontology.json` or `tools/lexicon.json` deliberately, regenerate, and say why
  in the commit message.
- A dangling anchor: open the target and copy the heading; the slug is the heading lowercased,
  punctuation dropped, spaces to hyphens.
- A stale generated block: `npm run gates:fix`.
- An unreachable document: link it from the nearest index.

## Tests

The gate tool has its own tests in [`test/toolchain/gates.test.ts`](../../test/toolchain/gates.test.ts):
each rule is exercised on a small fixture repository and shown to fire.

## Which files the gates see

The files git would commit: `git ls-files --cached --others --exclude-standard`, with tracked
files deleted from the working tree dropped. `.gitignore` is therefore the only ignore list, the
same one ESLint and Prettier use, and a local build, an agent worktree or a scratch file can
never change a gate's result ([ADR-0009](../adr/ADR-0009-hermetic-targets-every-check-depends-only-on-the-tracked-tre.md)).
The gate tool needs `git` on the path; its tests create fixture repositories with `git init`.

## Performance

The suite reads every governed file once and runs in well under two seconds on this repository
(measured on the day it landed; see the `--json` output's counts). If it grows past what an
on-edit hook can afford, the hook narrows to the changed area before any rule is dropped.
