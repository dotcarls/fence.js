---
title: Hooks, skills, subagents and routing
doc_type: toolchain
status: living
---

# Hooks, skills, subagents and routing

Configured in [`.claude/settings.json`](../../.claude/settings.json) (project scope, committed).
Hook semantics follow the Claude Code documentation: exit 0 is silent, exit 2 blocks (where the
event can block) and shows stderr to the model.

**Every hook runs under the Node pinned in `mise.toml`.** Hooks inherit the Node of whatever
started them (Claude Code, a git GUI), which `devEngines` refuses when it is not the pinned
release. [`tools/hooks/pinned-node.sh`](../../tools/hooks/pinned-node.sh) asks mise for the
project's Node (`mise which node`, never installing anything) and puts it first on `PATH`. When
mise, the pinned Node or trust in `mise.toml` is missing, a hook says which check did not run
and to run `mise trust && mise install`, rather than failing something else or reporting a pass.

## Hooks

| Event · matcher                                    | Script                                                                                                                | Behavior                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PostToolUse` · `Edit\|Write`                      | [`tools/hooks/post-edit-gates.sh`](../../tools/hooks/post-edit-gates.sh)                                              | Runs the gates after every edit inside the repository and feeds findings back (exit 2); if the pinned Node is missing, says the gates did not run (exit 2). Ignores edits outside the repository and under `node_modules`, `dist`, `site`, `coverage`.                                                                   |
| `Stop`                                             | [`tools/hooks/stop-checkpoint.sh`](../../tools/hooks/stop-checkpoint.sh)                                              | Blocks the stop while `docs/work/CHECKPOINT.md` is older than the newest change under `docs/work/items/` or `docs/adr/` (needs no toolchain), or fails `npm run checkpoint`; if the pinned Node is missing, reports that the content check did not run (`systemMessage`) instead of blocking. Honors `stop_hook_active`. |
| `SessionStart` · `startup\|resume\|compact\|clear` | [`tools/hooks/session-start-context.sh`](../../tools/hooks/session-start-context.sh)                                  | Prints the checkpoint summary (milestone, next action, in progress) and whether the pinned Node is installed.                                                                                                                                                                                                            |
| git `pre-commit`                                   | `simple-git-hooks` → [`with-pinned-node.sh`](../../tools/hooks/with-pinned-node.sh) → `lint-staged` + `npm run gates` | Formats and lints staged files, runs the related tests, then the gate suite.                                                                                                                                                                                                                                             |
| git `pre-push`                                     | `simple-git-hooks` → `with-pinned-node.sh` → `npm run check:clean`: the whole chain on a clean export of HEAD         |

## Skills (`.claude/skills/`)

| Skill                                                     | Purpose                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`/gates`](../../.claude/skills/gates/SKILL.md)           | Run the suite, apply `--fix`, explain remaining findings.                                     |
| [`/checkpoint`](../../.claude/skills/checkpoint/SKILL.md) | Refresh `docs/work/CHECKPOINT.md` per the [protocol](checkpoint-protocol.md) and validate it. |
| [`/release`](../../.claude/skills/release/SKILL.md)       | Cut a release the canonical way, stopping before push and publish.                            |

## Subagents (`.claude/agents/`)

| Definition                                                       | Use for                                                                                  | Tools                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| [`fence-implementer`](../../.claude/agents/fence-implementer.md) | One work item with written criteria: code, tests, examples, toolchain scripts            | read, search, shell, write, edit              |
| [`fence-scribe`](../../.claude/agents/fence-scribe.md)           | Documents, tracker items, checkpoint, cross-references                                   | read, search, shell, write, edit              |
| [`fence-reviewer`](../../.claude/agents/fence-reviewer.md)       | Attacking finished work: behavior, types, docs, release candidates; reports, never fixes | read, search, shell (read-only by convention) |

None pins a model or an effort; the coordinating session chooses at dispatch.

## Routing

| Work                                              | Route                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| Decide architecture, API surface, process         | The coordinating session writes the ADR; the owner accepts it        |
| Implement an item whose criteria are written      | `fence-implementer`, then `fence-reviewer` on the result             |
| Write or fix documents, items, the checkpoint     | `fence-scribe`                                                       |
| Verify a claim of doneness or a release candidate | `fence-reviewer`; two reviewers with distinct mandates for a release |
| Mechanical edits under a page, a rename, a typo   | The coordinating session, directly                                   |

**Pool size.** At most three subagents at a time, by the owner's direction (2026-09-16):
one implementer or scribe plus one reviewer, or two reviewers with distinct mandates. Prefer one
strong reviewer over per-finding verifier fan-out; triage findings with concrete evidence
yourself.

**What every agent report must contain.** What was verified and how (commands and their output),
what was not run, and `git status --short` at the end. An agent that created temporary files
deletes them; an agent does not commit.
