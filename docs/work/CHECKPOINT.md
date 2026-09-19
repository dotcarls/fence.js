---
doc_type: checkpoint
milestone: '2.x'
updated: '2026-09-19'
next_action: 'Owner: FJ-0025 — allow npm publish on the trusted publisher, re-run the failed publish job of run 35456319225 before 2026-09-26T16:52Z, then push main; FJ-0028 verifies the automated release on GitHub.'
in_progress_items: []
session: '2026-09-19 — npm refused the v2.0.2 publish: its trusted publisher allows staged publishing only (FJ-0025). Per the owner, releases are now automated from trunk (ADR-0013): Conventional Commits enforced (FJ-0026); a candidate vX.Y.Z-rc.N before the checks, promoted after them (FJ-0027). Reviewed and applied. Nothing pushed.'
---

# Checkpoint

## Now

Releases are automated from `main`, in local commits, none pushed
([ADR-0013](../adr/ADR-0013-trunk-based-continuous-release-conventional-commits-semantic.md)):

- a push whose Conventional Commits warrant a release is tagged `vX.Y.Z-rc.N`;
- once every check passes, the verified tarball is published, `vX.Y.Z` is tagged on the same
  commit, and the GitHub release is created;
- every commit must be a Conventional Commit.

2.0.2 is tagged but not on npm (FJ-0025).

## Done

- 2.0.0 to 2.0.2 milestones: FJ-0001 to FJ-0024 (FJ-0010 and FJ-0019 cancelled).
- Automated release: FJ-0026, FJ-0027.

## In progress

Nothing. FJ-0025 and FJ-0028 are the owner's.

## Next action

Owner, in order:

1. npmjs.com → fence.js → Settings → the trusted publisher (`release.yml`, environment `npm`):
   allow `npm publish`.
2. Re-run the failed `publish` job of Release run 35456319225. It publishes 2.0.2, and the
   artifact expires 2026-09-26T16:52Z.
3. `git push origin main`. The pre-push hook runs check:clean with CodeQL. The commits since
   v2.0.2 warrant no release, so the run checks and deploys Pages only (FJ-0028, criterion 1).
4. Optional: a tag ruleset on `v*`, and a `main` policy on the `npm` environment
   ([release-process](../toolchain/release-process.md#owner-settings-the-pipeline-depends-on)).

## Open questions

- Whether "a pre-release … should always be calculated and tagged" means every push, including
  `docs:` and `chore:` ones. As built, a push that warrants no release gets no candidate tag
  (ADR-0013).
- FJ-0013 — whether to release 1.x from `v1` (owner). It would need a semantic-release
  maintenance branch ([release-process](../toolchain/release-process.md#maintenance-lines)).
- FJ-0011 — async validators need an ADR before they are ready.
- FJ-0012 — the ESM CDN import is unverified until 2.x is on npm.
