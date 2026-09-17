---
name: checkpoint
description: Write or refresh docs/work/CHECKPOINT.md per the checkpoint protocol (milestone, done, in progress, exact next action, open questions) and validate it. Use before ending a session, when context runs short, after a release, or when a work item changes status.
allowed-tools: Read, Edit, Write, Bash(npm run *), Bash(npx tsx tools/gates/cli.ts *), Bash(git status *), Bash(git log *)
argument-hint: '[optional: one-line note about what changed]'
---

# /checkpoint

Follow [docs/toolchain/checkpoint-protocol.md](../../../docs/toolchain/checkpoint-protocol.md).

1. Read `docs/work/CHECKPOINT.md` and `docs/work/README.md` (the generated item index); run
   `git status --short`.
2. Rewrite the checkpoint so that the front matter `updated` is today, `milestone` is current,
   `next_action` is one imperative sentence naming the FJ ids it concerns, `in_progress_items`
   lists every in-progress item, and the sections **Now**, **Done**, **In progress**,
   **Next action** and **Open questions** are complete and short.
3. `npm run checkpoint` and `npm run gates`; fix what they report.
4. Note supplied by the caller: $ARGUMENTS
