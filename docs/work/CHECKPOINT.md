---
doc_type: checkpoint
milestone: '2.0.2'
updated: '2026-09-19'
next_action: 'Owner: FJ-0025 — upgrade mise to 2026.9.11+, mise install, git push origin main; once CI on main is green (CodeQL included), git push origin v2.0.2; then verify the CDN import (FJ-0012).'
in_progress_items: [FJ-0026, FJ-0027]
session: '2026-09-19 — the owner pushed main and v2.0.1; CodeQL failed both runs (js/incomplete-sanitization in tools/gates/generate.ts), so Pages did not deploy and 2.0.1 was not published. Reproduced locally, fixed (FJ-0022), and made CodeQL a local target run by the pre-push hook and by CI with the same pinned CLI (FJ-0023, ADR-0012).'
---

# Checkpoint

## Now

**Milestone 2.0.2 is cut**: `main` carries `Release v2.0.2` (556e3ea), tagged `v2.0.2`. Nothing is
pushed; publishing is the owner's act (FJ-0025). 2.0.0 and 2.0.1 stay tagged and unpublished (a
pushed tag is not moved); 2.0.2 is the first 2.x on npm.

## Done

- 2.0.0 milestone: FJ-0001 to FJ-0009 (FJ-0010 cancelled).
- 2.0.1 milestone: FJ-0014, FJ-0015, FJ-0016, FJ-0017, FJ-0018, FJ-0020, FJ-0021 (FJ-0019
  cancelled: pushed, not published).
- 2.0.2 milestone: FJ-0022, FJ-0023, FJ-0024.

## In progress

- FJ-0026 — Conventional Commits enforced locally and in CI.
- FJ-0027 — automated trunk-based release (ADR-0013).

FJ-0025 is the owner's: npm refused the v2.0.2 publish (see its notes).

## Next action

Owner, in order:

1. Upgrade mise to 2026.9.11 or later (`brew upgrade mise`); `mise.toml` now refuses older ones,
   so every hook reports that until then.
2. `mise install` (fetches CodeQL 2.27.0, 2.7 GB on macOS).
3. `git push origin main`; the pre-push hook runs `npm run check:clean` (chain and CodeQL, about
   5 minutes).
4. Once CI on `main` is green, CodeQL included, and Pages has deployed: `git push origin v2.0.2`.
   The Release workflow runs every check again and only then publishes.
5. Verify the CDN import (FJ-0012).

## Open questions

- FJ-0013 — whether to release 1.0.2 from `v1` (owner); releasing an old line is not supported
  by the pipeline yet ([release-process](../toolchain/release-process.md#maintenance-lines)).
- FJ-0011 — async validators need an ADR before they are ready (2.1.0).
- FJ-0012 — the ESM CDN import is unverified until 2.x is on npm (2.0.2).
- Optional hardening, not done: a deployment branch policy on the `npm` environment limited to
  `v*` tags, and required status checks on `main` for pull requests.
