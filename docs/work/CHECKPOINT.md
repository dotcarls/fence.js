---
doc_type: checkpoint
milestone: "2.0.0"
updated: "2026-09-16"
next_action: "Owner: complete FJ-0010 — configure npm trusted publishing for this repository and workflow, then `git push origin master --follow-tags` so the Release workflow publishes 2.0.0; afterwards decide FJ-0013 and open 2.1.0 with FJ-0011."
in_progress_items: []
session: "2026-09-16 — removed the 1.x compatibility surface (FJ-0007), scaffolded the agentic toolchain and governance (FJ-0008), merged v2 into master and cut Release v2.0.0 with tag v2.0.0 (FJ-0009). Nothing pushed or published."
---

# Checkpoint

## Now

**Milestone 2.0.0 is cut**: `master` carries the `Release v2.0.0` commit and the `v2.0.0` tag.
Nothing has been pushed or published; that is the owner's act (FJ-0010). `v1` carries the
stabilized 1.x toolchain (FJ-0013 decides whether it is released).

## Done

- FJ-0002 — the 1.x toolchain stabilized on `v1`.
- FJ-0003 — toolchain replaced, code ported to TypeScript.
- FJ-0004 — the core rewritten; serialization format 2.
- FJ-0005 — two review rounds; every major finding fixed.
- FJ-0006 — README, MIGRATING, CHANGELOG.
- FJ-0007 — the 1.x compatibility surface removed.
- FJ-0008 — the agentic toolchain and governance scaffold.
- FJ-0009 — Release 2.0.0: merged, committed, tagged.

## In progress

Nothing. The next items are the owner's (FJ-0010, FJ-0013) or need an ADR first (FJ-0011).

## Next action

Owner: on npmjs.com, add trusted publishing for `dotcarls/fence.js` with workflow
`release.yml` (environment `npm`), then `git push origin master --follow-tags`. The Release
workflow runs the check chain, publishes 2.0.0 under `latest` with provenance and creates the
GitHub release from the changelog section; the Docs workflow publishes the API reference. Then
verify the CDN import (FJ-0012), decide the 1.x line (FJ-0013), and start 2.1.0 by writing the
async-validators ADR (FJ-0011).

## Open questions

- FJ-0013 — whether to release 1.0.2 from `v1` (owner).
- FJ-0011 — async validators need an ADR before they are ready (2.1.0).
- FJ-0012 — the ESM CDN import is unverified until 2.0.0 is on npm.
