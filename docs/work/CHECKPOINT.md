---
doc_type: checkpoint
milestone: '2.0.2'
updated: '2026-09-19'
next_action: 'Verify FJ-0023 (npm run check:clean runs npm run codeql on the exported HEAD), commit, then cut Release v2.0.2 (FJ-0024) and hand the two-step push to the owner (FJ-0025).'
in_progress_items: [FJ-0022, FJ-0023, FJ-0024]
session: '2026-09-19 — the owner pushed main and v2.0.1; CodeQL failed both runs (js/incomplete-sanitization in tools/gates/generate.ts), so Pages did not deploy and 2.0.1 was not published. Reproduced locally, fixed (FJ-0022), and made CodeQL a local target run by the pre-push hook and by CI with the same pinned CLI (FJ-0023, ADR-0012).'
---

# Checkpoint

## Now

**Milestone 2.0.2.** 2.0.1 is tagged and pushed but unpublished: CodeQL failed its Release
workflow and CI on `main` (FJ-0019, cancelled). The fix and the local CodeQL target are in the
working tree; the release follows.

## Done

- 2.0.0 milestone: FJ-0001 to FJ-0009 (FJ-0010 cancelled).
- 2.0.1 milestone: FJ-0014, FJ-0015, FJ-0016, FJ-0017, FJ-0018, FJ-0020, FJ-0021 (FJ-0019
  cancelled: pushed, not published).

## In progress

- FJ-0022 — fixed and verified: `npm run codeql` reproduced the CI finding on the unfixed tree
  and reports none on the fixed one.
- FJ-0023 — `npm run codeql`, the CI job and ADR-0012 are written; the check:clean run is left.
- FJ-0024 — waits for FJ-0022 and FJ-0023.

## Next action

Run `npm run check:clean` on the committed fix under mise 2026.9.11 or later. Then cut Release
v2.0.2: the changelog section, `npm version 2.0.2 --no-git-tag-version`, the release commit and
the annotated tag. Hand FJ-0025 to the owner: `git push origin main`, then, once CI on `main` is
green, `git push origin v2.0.2`.

## Open questions

- FJ-0013 — whether to release 1.0.2 from `v1` (owner); releasing an old line is not supported
  by the pipeline yet ([release-process](../toolchain/release-process.md#maintenance-lines)).
- FJ-0011 — async validators need an ADR before they are ready (2.1.0).
- FJ-0012 — the ESM CDN import is unverified until 2.x is on npm.
- Optional hardening, not done: a deployment branch policy on the `npm` environment limited to
  `v*` tags, and required status checks on `main` for pull requests.
