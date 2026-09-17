---
title: Work tracking
doc_type: toolchain
status: living
---

# Work tracking

An in-repository tracker: **one Markdown file per item** under `docs/work/items/`, named
`FJ-NNNN-<kebab-slug>.md`, with YAML front matter validated against
[`tools/schemas/work-item.schema.json`](../../tools/schemas/work-item.schema.json). The generated
index is [`docs/work/README.md`](../work/README.md); the lifecycle is in [sdlc](sdlc.md).

## Front matter

| Field                    | Meaning                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `id`                     | `FJ-NNNN`, allocated by `npm run work -- new`                                                            |
| `title`                  | 3–120 characters; also the file slug                                                                     |
| `type`                   | `epic` · `story` · `task` · `bug` · `spike` · `decision` · `release` ([taxonomy](taxonomy.md))            |
| `status`                 | `backlog` → `ready` → `in-progress` → `review` → `done`; also `blocked`, `cancelled`                     |
| `priority`               | `p0` (blocks the milestone) · `p1` · `p2` · `p3`                                                          |
| `milestone`              | The release the item ships in: a version (`2.1.0`), a line (`2.x`) or `null`                              |
| `parent`                 | The epic or story this belongs to                                                                        |
| `blocks` / `blocked_by`  | Dependency edges, kept symmetric (the gate refuses a one-sided edge)                                     |
| `blocked_reason`         | Required when `status: blocked` and `blocked_by` is empty                                                |
| `owner`                  | Who must act: `agent`, or a person's name when only they can (a push, an approval)                        |
| `acceptance_criteria[]`  | `{text, satisfied, evidence, verified_by}`                                                               |
| `links`                  | `code[]`, `docs[]`, `tests[]`, `adrs[]` — repository paths or ids; all must resolve                       |
| `created` / `updated`    | ISO dates. Status history is git's job (`git log --follow`), not the file's.                              |

## Rules (the `work-items` gate)

- The file name starts with the id.
- `parent`, `blocks` and `blocked_by` name items that exist; edges are symmetric.
- `status: blocked` carries `blocked_by` or `blocked_reason`.
- `status: done` ⇒ every criterion `satisfied: true` with an `evidence` link that resolves
  (a path, `path#anchor`, `FJ-NNNN` or `ADR-NNNN`), and no `blocked_by` item is still open.
- `status: in-progress` ⇒ the id appears in `docs/work/CHECKPOINT.md`.
- Every `links.*` entry resolves.
- A `## Description` section exists.

## Acceptance criteria and evidence

Criteria are the definition of done and are written before work starts. Evidence is a live link
into the repository: a test file, a document section, a decision record, a recorded command
result in the item's Notes. `verified_by` names the check — a test name, a gate, a command, or
`human` when a person executed a written procedure.

## Commands

```bash
npm run work -- new --title "Async validators" --type story --priority p2 --milestone 2.1.0 \
    --criterion "runAsync awaits every step" --criterion "run() rejects an async validator"
npm run gates:fix             # regenerate docs/work/README.md after editing items by hand
```

`work new` allocates the next id above the highest one on disk, writes every required field
with a valid value, refuses to create an item as `done`, `in-progress` or `cancelled`, and
regenerates the index so the item is reachable immediately. Everything else — status, criteria,
evidence, links — is edited in the file, and the gates keep it honest.

## Template

[`docs/work/TEMPLATE.md`](../work/TEMPLATE.md).
