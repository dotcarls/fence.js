---
doc_type: checkpoint
milestone: '2.0.1'
updated: '2026-09-19'
next_action: 'Verify FJ-0014 (every target hermetic) in a fresh clone and a stale working tree on all three Node lines, then close FJ-0014 to FJ-0017, rename the GitHub branch and Pages settings, and cut FJ-0018.'
in_progress_items:
  - FJ-0014
  - FJ-0015
  - FJ-0016
  - FJ-0017
session: '2026-09-19 — the owner pushed 2.0.0; CI and the release failed at eslint. Fixing hermeticity (FJ-0014), CI gating (FJ-0015), dependency currency (FJ-0016) and the branch rename (FJ-0017) for 2.0.1.'
---

# Checkpoint

## Now

**Milestone 2.0.1.** 2.0.0 was tagged and pushed but never published: CI and the release job
failed at `eslint`. The fixes are implemented in the working tree on the local `main` branch and
are being verified.

## Done

- 2.0.0 milestone: FJ-0001 to FJ-0009 (FJ-0010 cancelled: 2.0.0 is never published).

## In progress

- **FJ-0014** — hermetic targets: implemented; verification in a fresh clone pending.
- **FJ-0015** — reusable checks gate Pages and publishing: workflows written, actionlint clean.
- **FJ-0016** — dependencies at latest (TypeScript held at 6.0.3): lockfile regenerated.
- **FJ-0017** — `main`: local branch renamed; GitHub branch, Pages and environment pending.

## Next action

Run every target alone and `npm run check` in a fresh clone (no `dist/`) and in the working tree
with a stale `dist/`, on Node 24.21.0, 22.23.2 and 26.9.0; record the results in FJ-0014; commit;
rename the GitHub branch and switch Pages to Actions; cut 2.0.1 (FJ-0018). FJ-0019 is the owner's.

## Open questions

- FJ-0013 — whether to release 1.0.2 from `v1` (owner).
- FJ-0011 — async validators need an ADR before they are ready (2.1.0).
- FJ-0012 — the ESM CDN import is unverified until a 2.x is on npm.
