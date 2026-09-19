---
doc_type: checkpoint
milestone: '2.0.1'
updated: '2026-09-19'
next_action: 'Finish FJ-0018: tag the Release v2.0.1 commit v2.0.1, then record the tag in FJ-0018 and hand FJ-0019 (push) to the owner.'
in_progress_items:
  - FJ-0018
session: '2026-09-19 — fixed what stopped 2.0.0 from publishing (FJ-0014 hermetic targets, FJ-0015 gated pipeline), updated dependencies (FJ-0016), renamed the default branch to main (FJ-0017), adopted mise with the Active LTS default and the upcoming LTS as the only other tested line (FJ-0020), fixed a 2.4–3.3x run() regression (FJ-0021), and applied a review of all of it.'
---

# Checkpoint

## Now

**Milestone 2.0.1, at the release step.** FJ-0014 to FJ-0017, FJ-0020 and FJ-0021 are done;
FJ-0018 (the release commit and tag) is in progress. On GitHub the default branch is already
`main`, Pages builds from Actions, and the `github-pages` environment allows `main` only. 2.0.0
stays tagged and unpublished (its pipeline failed; a pushed tag is not moved).

## Done

- 2.0.0 milestone: FJ-0001 to FJ-0009 (FJ-0010 cancelled).
- 2.0.1 milestone: FJ-0014, FJ-0015, FJ-0016, FJ-0017, FJ-0020, FJ-0021.

## In progress

- **FJ-0018 — Release 2.0.1.** This is the release commit; the tag follows it.

## Next action

Commit the fixes; move `[Unreleased]` to `## [2.0.1] - 2026-09-19`; `npm version 2.0.1
--no-git-tag-version`; `npm run check:clean`; commit `Release v2.0.1`; `git tag -a v2.0.1`. Mark
FJ-0018 done only then, and hand FJ-0019 to the owner: `git push origin main --follow-tags`.

## Open questions

- FJ-0013 — whether to release 1.0.2 from `v1` (owner); releasing an old line is not supported
  by the pipeline yet ([release-process](../toolchain/release-process.md#maintenance-lines)).
- FJ-0011 — async validators need an ADR before they are ready (2.1.0).
- FJ-0012 — the ESM CDN import is unverified until 2.0.1 is on npm.
- Optional hardening, not done: a deployment branch policy on the `npm` environment limited to
  `v*` tags, and required status checks on `main` for pull requests.
