---
doc_type: checkpoint
milestone: "2.0.0"
updated: "2026-09-16"
next_action: "Finish FJ-0009: merge v2 into master, write the dated 2.0.0 changelog section, bump to 2.0.0, commit `Release v2.0.0` and tag `v2.0.0`; then hand FJ-0010 (push and publish) to the owner."
in_progress_items:
  - FJ-0009
session: "2026-09-16 — removed the 1.x compatibility surface (FJ-0007) and scaffolded the agentic toolchain and governance (FJ-0008): gate tool, schemas, ontology, lexicon, taxonomy, metamodel, SDLC, ADR-0000…ADR-0008, work items FJ-0001…FJ-0013, hooks, skills, agents."
---

# Checkpoint

## Now

**Milestone 2.0.0**, at the release step. Every functional item is done; the release item
(FJ-0009) is in progress. Nothing has been pushed or published; `v2` is the working branch and
`v1` carries the stabilized 1.x toolchain.

## Done

- FJ-0002 — the 1.x toolchain stabilized on `v1`.
- FJ-0003 — toolchain replaced, code ported to TypeScript.
- FJ-0004 — the core rewritten; serialization format 2.
- FJ-0005 — two review rounds; every major finding fixed.
- FJ-0006 — README, MIGRATING, CHANGELOG.
- FJ-0007 — the 1.x compatibility surface removed.
- FJ-0008 — the agentic toolchain and governance scaffold (this).

## In progress

- **FJ-0009 — Release 2.0.0.** The tree is gate-clean and `npm run check` is green; remaining:
  merge to `master`, date the changelog section, bump, commit, tag.

## Next action

Follow [release-process](../toolchain/release-process.md) for 2.0.0 on `master`: merge `v2`
(no fast-forward), move the changelog's 2.0.0 section from "Unreleased" to
`## [2.0.0] - 2026-09-16`, `npm version 2.0.0 --no-git-tag-version`, commit `Release v2.0.0`,
`git tag -a v2.0.0`. Then mark FJ-0009 done with the tag as evidence, refresh this file, and stop:
FJ-0010 is the owner's.

## Open questions

- FJ-0013 — whether to release 1.0.2 from `v1` (owner).
- FJ-0011 — async validators need an ADR before they are ready (2.1.0).
- FJ-0012 — the ESM CDN import is unverified until 2.0.0 is on npm.
