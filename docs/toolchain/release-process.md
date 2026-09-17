---
title: Release process
doc_type: governance
status: living
---

# Release process

Decided in [ADR-0008](../adr/ADR-0008-release-process.md). Semantic versioning, Keep a Changelog,
one release commit and one annotated tag on `master`, publication by a tag-triggered workflow
using npm trusted publishing. Nothing here is published from a laptop.

## Versioning

| Change                                                                         | Version part |
| ------------------------------------------------------------------------------ | ------------ |
| Public API or serialization format change that can break a correct consumer   | major        |
| New capability, new export, wider input accepted                               | minor        |
| Everything else: fixes, docs, dependencies, performance                         | patch        |
| Not yet stable for a version                                                   | `-beta.N` prerelease; published under the `next` dist-tag |

## Steps

1. **Close the milestone.** Every work item with `milestone: x.y.z` is `done` or moved;
   `npm run gates` is green.
2. **Write the changelog section.** Move the `[Unreleased]` entries into
   `## [x.y.z] - YYYY-MM-DD`, Keep a Changelog categories only (Added · Changed · Deprecated ·
   Removed · Fixed · Security). Cite work item ids where an entry realizes one. The `changelog`
   gate checks the shape.
3. **Run the whole chain.** `npm run check`.
4. **Bump, commit, tag.** `npm run release` does this from `master` when a remote is configured:
   it runs the check, bumps `package.json`, verifies the changelog section exists
   (`scripts/check-changelog.mjs`), commits `Release vx.y.z`, tags `vx.y.z` and pushes. Without
   a remote, or when an agent prepares the release, the equivalent by hand is:

   ```sh
   npm version x.y.z --no-git-tag-version
   git commit -am "Release vx.y.z"
   git tag -a vx.y.z -m "Release vx.y.z"
   ```

5. **Publish (owner only).** `git push origin master --follow-tags`. The tag triggers
   `.github/workflows/release.yml`: check chain, `npm publish --provenance` (dist-tag `latest`,
   or `next` for a prerelease) and a GitHub release whose notes are the changelog section.
   Trusted publishing must be configured once on npmjs.com for this repository and workflow.
6. **Checkpoint.** Refresh `docs/work/CHECKPOINT.md`; open the next milestone.

## What ships

`npm pack` contains `dist/`, `src/`, `README.md`, `MIGRATING.md`, `CHANGELOG.md`, `LICENSE` and
`package.json`; `publint` and `attw` check the shape in the chain.

## Maintenance lines

Older majors live on branches named after the line (`v1`). A fix there is released from that
branch with the same steps and a `1.x.y` version.
