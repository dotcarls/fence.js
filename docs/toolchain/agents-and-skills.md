---
title: Hooks, skills, subagents and routing
doc_type: toolchain
status: living
---

# Hooks, skills, subagents and routing

Configured in [`.claude/settings.json`](../../.claude/settings.json) (project scope, committed).
Hook semantics follow the Claude Code documentation: exit 0 is silent, exit 2 blocks (where the
event can block) and shows stderr to the model.

## Hooks

| Event · matcher                                    | Script                                                                               | Behavior                                                                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PostToolUse` · `Edit\|Write`                      | [`tools/hooks/post-edit-gates.sh`](../../tools/hooks/post-edit-gates.sh)             | Runs `npm run gates` after every edit inside the repository and feeds findings back (exit 2). Ignores edits outside the repository and under `node_modules`, `dist`, `site`, `coverage`. |
| `Stop`                                             | [`tools/hooks/stop-checkpoint.sh`](../../tools/hooks/stop-checkpoint.sh)             | Blocks the stop while `docs/work/CHECKPOINT.md` is older than the newest change under `docs/work/items/` or `docs/adr/`, or fails `npm run checkpoint`. Honors `stop_hook_active`.       |
| `SessionStart` · `startup\|resume\|compact\|clear` | [`tools/hooks/session-start-context.sh`](../../tools/hooks/session-start-context.sh) | Prints the checkpoint summary (milestone, next action, in progress) into the context.                                                                                                    |
| git `pre-commit`                                   | `simple-git-hooks` → `lint-staged` + `npm run gates`                                 | Formats and lints staged files, runs the related tests, then the gate suite.                                                                                                             |
| git `pre-push`                                     | `simple-git-hooks` → `npm run typecheck && npm test`                                 | The owner's push runs the type check and the suite first.                                                                                                                                |

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
