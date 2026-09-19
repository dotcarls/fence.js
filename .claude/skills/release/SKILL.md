---
name: release
description: Prepare a fence.js release the canonical way — changelog section, version bump, release commit and annotated tag on main — without pushing or publishing. Use when the owner asks for a release or when a milestone's items are all done.
allowed-tools: Read, Edit, Bash(npm run *), Bash(npm version *), Bash(git *)
argument-hint: '<version, e.g. 2.1.0>'
---

# /release $ARGUMENTS

Follow [docs/toolchain/release-process.md](../../../docs/toolchain/release-process.md) exactly:

1. On `main`, with a clean tree: every work item with `milestone: $ARGUMENTS` is `done`
   (`npm run gates` is green); `CHANGELOG.md` has `## [$ARGUMENTS] - <today>` with the
   Keep a Changelog categories and nothing left under `[Unreleased]` that ships now.
2. `npm run check` and `npm run codeql` (everything CI runs, locally).
3. `npm version $ARGUMENTS --no-git-tag-version`, commit as `Release v$ARGUMENTS` with the
   co-author trailer, then `git tag -a v$ARGUMENTS -m "Release v$ARGUMENTS"`.
4. Update `docs/work/CHECKPOINT.md`: the release item is done; the next action is the owner's
   two pushes: `git push origin main`, and only once CI on `main` is green, `git push origin
v$ARGUMENTS` (the tag runs every check again and only then publishes).
5. Do not push and do not run `npm publish`; both are the owner's acts.
