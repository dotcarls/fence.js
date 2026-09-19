---
doc_type: checkpoint
milestone: '2.0.1'
updated: '2026-09-19'
next_action: 'Owner: FJ-0019 — git push origin main --follow-tags; confirm CI on main passes before Pages deploys, and that the Release workflow on v2.0.1 runs its checks before publishing; then verify the CDN import (FJ-0012).'
in_progress_items: []
session: '2026-09-19 — fixed what stopped 2.0.0 from publishing (FJ-0014, FJ-0015), updated dependencies (FJ-0016), renamed the default branch to main (FJ-0017), adopted mise with the Active LTS default and the upcoming LTS as the only other tested line (FJ-0020), fixed a 2.4–3.3x run() regression (FJ-0021), applied a review, and cut Release v2.0.1 with tag v2.0.1 (FJ-0018). Nothing pushed or published.'
---

# Checkpoint

## Now

**Milestone 2.0.1 is cut**: `main` carries `Release v2.0.1` (6d856bf), tagged `v2.0.1`. Nothing
is pushed; publishing is the owner's act (FJ-0019). On GitHub the default branch is already
`main`, Pages builds from Actions, and the `github-pages` environment allows `main` only. 2.0.0
stays tagged and unpublished (its pipeline failed; a pushed tag is not moved).

## Done

- 2.0.0 milestone: FJ-0001 to FJ-0009 (FJ-0010 cancelled).
- 2.0.1 milestone: FJ-0014, FJ-0015, FJ-0016, FJ-0017, FJ-0018, FJ-0020, FJ-0021.

## In progress

Nothing. FJ-0019 is ready and is the owner's.

## Next action

Owner: `git push origin main --follow-tags` (the pre-push hook runs `npm run check:clean` under
mise first). Expect CI on `main` to pass every check before the `pages` job deploys, and the
Release workflow on `v2.0.1` to pass every check on the tagged commit before it publishes the
verified tarball. Then verify the CDN import (FJ-0012). Local development: `mise trust && mise
install`, then run npm under mise; npm refuses other Node versions.

## Open questions

- FJ-0013 — whether to release 1.0.2 from `v1` (owner); releasing an old line is not supported
  by the pipeline yet ([release-process](../toolchain/release-process.md#maintenance-lines)).
- FJ-0011 — async validators need an ADR before they are ready (2.1.0).
- FJ-0012 — the ESM CDN import is unverified until 2.0.1 is on npm.
- Optional hardening, not done: a deployment branch policy on the `npm` environment limited to
  `v*` tags, and required status checks on `main` for pull requests.
