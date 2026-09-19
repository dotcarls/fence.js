---
id: ADR-0013
title: 'Trunk-based continuous release: Conventional Commits, semantic-release, candidates promoted when every check passes'
status: accepted
date: 2026-09-19
deciders:
  - Tim Carlson
  - Claude (Opus 5)
tags: [release, process, ci, npm, git]
supersedes: ADR-0008
superseded_by: null
related:
  - docs/toolchain/release-process.md
  - release.config.mjs
  - tools/release/release.ts
  - commitlint.config.mjs
---

# ADR-0013 — Trunk-based continuous release: Conventional Commits, semantic-release, candidates promoted when every check passes

## Context

ADR-0008 had releases cut by hand: a changelog section, a `Release vX.Y.Z` commit, an annotated
tag pushed by the owner. Three versions were tagged and never published:

- 2.0.0: eslint differed between local runs and CI.
- 2.0.1: CodeQL failed.
- 2.0.2: npm answered `403 … OIDC permission denied for this action`.

The 2.0.2 cause is npm's, not the pipeline's. A trusted publisher configured after 2026-09-03 may
by default only `npm stage publish`; `npm publish` must be ticked under its **Allowed actions**
(<https://docs.npmjs.com/trusted-publishers/>, retrieved 2026-09-19). This package's was
configured on 2026-09-19.

On 2026-09-19 the owner directed:

- `main` is protected, and only the owner and other maintainers may bypass that.
- Every commit follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/#specification).
- semantic-release or an equivalent decides version bumps and generates the changelog.
- Branching is [trunk-based development](https://trunkbaseddevelopment.com/release-from-trunk/),
  with every part of publishing automated, tagging included.
- After a release, each new merge to `main` gets a calculated pre-release version, tagged. The
  pre-release number increments until every CI check passes, and the version is then promoted
  and published as a proper release.

`main`'s ruleset "Main" works like this:

- It restricts creating, updating and deleting the branch, and forbids non-fast-forward pushes.
- It requires a linear history.
- It exempts the maintain and admin roles and one integration, Dependabot (app 29110).
- It does not cover tags.

## Options considered

| Option                                                                                                                                                            | Pros                                                                                                                          | Cons                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. semantic-release as documented: publish in its `publish` step, `@semantic-release/git` commits `CHANGELOG.md` and `package.json` back to `main`                | The most common setup                                                                                                         | Pushing to `main` needs a bot that bypasses the ruleset; the release tag lands on a commit the checks never saw; a failed publish leaves the tag, so the version is lost |
| B. semantic-release prerelease branches (`next`, `beta`) merged into `main` to promote                                                                            | Built into semantic-release                                                                                                   | Long-lived release branches, not trunk-based; prereleases are published to npm before they are known good                                                                |
| C. release-please: a release pull request a maintainer merges                                                                                                     | Changelog kept in the repository                                                                                              | A human step per release; a bot commits to `main`                                                                                                                        |
| D. semantic-release decides; each push to `main` is tagged as a candidate before its checks and promoted after all of them, publishing the verified tarball first | The owner's flow exactly; nothing commits to `main`; the release tag is on the checked commit; a failed publish costs nothing | Custom glue (one small module); release notes live in GitHub releases, not in a file in the repository                                                                   |

## Decision

**D.**

1. **Commits.** Every commit is a Conventional Commit, checked by commitlint with
   `@commitlint/config-conventional` in three places:
   - the git `commit-msg` hook;
   - CI on every pull request, for its commits and its title (a squash merge writes the title);
   - CI on every push to `main`, for the commits that push adds (`before..sha`), so a
     nonconforming commit fails the run that brought it and no later one. A push whose run was
     replaced while it waited, or a manual run (only HEAD), is covered only by the other two
     checks. The run on `main` is a backstop for maintainers' direct pushes.

   What each type releases is semantic-release's `conventionalcommits` rules:

   | Commit                                     | Release |
   | ------------------------------------------ | ------- |
   | `!` or a `BREAKING CHANGE:` footer         | major   |
   | `feat`                                     | minor   |
   | `fix`, `perf`, `revert`                    | patch   |
   | Any other type, `build(deps-dev)` included | nothing |

2. **Trunk.** `main` is the only branch that releases. Changes reach it through short-lived
   pull requests, or through a maintainer's push that bypasses the ruleset. There are no
   release branches and no release commits.
3. **Candidate.** Every push to `main` runs `release.yml`.
   - semantic-release, run dry with only the commit plugins, names the version X.Y.Z that the
     commits since the last release warrant.
   - HEAD is tagged `vX.Y.Z-rc.N`, where N is one more than the highest candidate for X.Y.Z so
     far. A re-run on the same commit reuses its tag.
   - The workflow token pushes the tag; the ruleset does not cover tags.
   - A push that warrants no release gets no tag.
   - Candidates are git tags only. Nothing is published before every check passes.
4. **Checks.** The whole of `checks.yml` runs on the candidate, with X.Y.Z stamped into
   `package.json`, so the tarball checked and consumed is the one to be published. In git,
   `package.json` says `0.0.0-development`.
5. **Promotion.** Once every check passes, semantic-release runs from the same commit with no
   human step:
   - It refuses a version other than the candidate's, or a tarball that does not hold it.
   - It publishes that tarball to npm under `latest`, with provenance, through trusted
     publishing. A version already on npm with the same bytes is left alone.
   - It then tags `vX.Y.Z` on the candidate's commit and creates the GitHub release with the
     generated notes.
   - Publishing runs in semantic-release's `prepare` step, before the tag. A failed publish
     leaves no release tag, so a re-run promotes the same version.
   - If `main` has moved on, semantic-release declines and the newer run releases instead.
6. **Nothing commits to `main`.** The pipeline holds no credential that bypasses the ruleset.
   - The generated notes are the GitHub releases.
   - `CHANGELOG.md` stays as the hand-written record through 2.0.2.
   - The `changelog` gate refuses an `[Unreleased]` section there.
7. **One run at a time.** `release.yml` runs in one concurrency group per branch that never
   cancels a run in progress, so each candidate is named against the releases before it. A
   newer push waiting in the group replaces an older one that has not started; the newer run
   covers its commits. Pages deploys after the promotion, so the documentation never shows a
   version that is not on npm.
8. **Tooling:**
   - semantic-release 25.0.9, with its bundled commit analyzer, notes generator and GitHub
     plugins;
   - `@semantic-release/exec` 7.1.0 for the verify and publish steps;
   - `conventional-changelog-conventionalcommits` 9.3.1. Its 10.x line needs
     `conventional-changelog-writer` 9, and semantic-release's plugins use 8. Held like
     TypeScript in ADR-0004 A1.
   - `@commitlint/cli` and `@commitlint/config-conventional` 21.2.3.
   - release-it, `.release-it.json`, `scripts/changelog.mjs` and the `/release` skill are removed.
9. **What stays the owner's:**
   - what reaches `main`, which now means what is released;
   - the npm trusted publisher: `release.yml`, environment `npm`, with `npm publish` among its
     allowed actions;
   - the repository's rulesets and settings. Two are recommended, not yet in place:
     - a tag ruleset on `v*` that only the pipeline and administrators may bypass, so that
       "only the pipeline tags" is enforced rather than conventional;
     - a deployment-branch policy of `main` on the `npm` environment.

     Dependabot being able to bypass `main`'s ruleset is the owner's call.

## Consequences

- **Every push that warrants a release ships** within one pipeline run. That is continuous
  delivery from trunk: merging a `feat` releases a minor.
- **A version is lost only after npm has it.** Before, a failed check or publish after the tag
  cost the version; now a failure costs a candidate tag.

  Two failures after publishing need a person:
  - npm has the version but the tag push failed;
  - the tag exists but creating the GitHub release failed.

  A re-run of that job completes both only while `main` has not moved, and while the checks'
  tarball artifact exists (7 days). Otherwise [release-process](../toolchain/release-process.md#when-something-fails)
  gives the manual steps.

- **Candidate tags accumulate** (`v2.1.0-rc.1`, `-rc.2`, …). They record what was tried.
- **Release notes are exactly the commits.** A commit's message is its changelog entry, so
  messages matter: [CONTRIBUTING](../../CONTRIBUTING.md) says how to write them.
- **The job that publishes installs the development dependencies** to run semantic-release,
  from the lockfile with install scripts off, as the pack job does.
- **2.0.2 is tagged but not on npm.** The pipeline treats it as the last release. Re-running
  the failed publish job of its Release run, once `npm publish` is allowed, publishes it
  (FJ-0025).
- **ADR-0010 stands, amended:** publishing follows the checks on the candidate's commit, not on
  a pushed tag. ADR-0008 is superseded.

## Verification

- `test/toolchain/release.test.ts` runs real git repositories with a local bare remote:
  - candidate naming and numbering, and re-runs;
  - releases for `feat`, `fix`, `perf`, `revert` and breaking changes, and none for `docs`,
    `chore`, `build(deps-dev)` or `ci(deps)`, and a patch for `fix(deps)`;
  - a failed publish leaving no tag, and the retry tagging the candidate's commit;
  - the verify and publish guards, with a stand-in for npm.
- The commit-msg hook refuses a nonconforming message and accepts a conforming one: run by
  hand, and by a real `git commit` that it refused (FJ-0026 notes).
- actionlint accepts the workflows.
- Not verifiable here: the GitHub and npm ends. Those are the first run on `main` (FJ-0027).

## Links

FJ-0025 · FJ-0026 · FJ-0027 · ADR-0008 · ADR-0010 · [release-process](../toolchain/release-process.md)
