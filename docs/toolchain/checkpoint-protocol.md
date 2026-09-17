---
title: Checkpoint / resume protocol
doc_type: toolchain
status: living
---

# Checkpoint / resume protocol

[`docs/work/CHECKPOINT.md`](../work/CHECKPOINT.md) is the single hand-off document between
sessions and across context compaction. It is short, always current, and validated against
[`checkpoint.schema.json`](../../tools/schemas/checkpoint.schema.json).

## Contents (all required)

Front matter: `doc_type: checkpoint`, `milestone`, `updated`, `next_action` (one imperative
sentence naming the `FJ-NNNN` ids it concerns), `in_progress_items`, optionally `session`.

Sections: **Now** (the milestone and where it stands) · **Done** (this milestone, with links) ·
**In progress** (items and where each stands) · **Next action** (imperative, one paragraph,
enough to resume without re-deriving) · **Open questions** (each linked to an ADR or item).

## When to write it

- Before any session ends (`/checkpoint`). The `Stop` hook refuses to end a session while the
  checkpoint is older than the newest change under `docs/work/items/` or `docs/adr/`.
- Whenever context is running short.
- After a release and whenever a work item changes status.

## On resume

1. `CLAUDE.md` (automatic) → 2. `CHECKPOINT.md` (the `SessionStart` hook prints its summary) →
3. `npm run gates` → 4. the in-progress items → 5. execute the next action. Do not re-plan what
the checkpoint already decided.

## Freshness rules

- Mechanical: the `Stop` hook compares modification times (two minutes of tolerance).
- Content (the `checkpoint` gate): every `in_progress_items` id exists and is `in-progress`;
  every `in-progress` item is listed; `next_action` names at least one open item while any item
  is in progress and never names a closed one; `updated` is not in the future.
