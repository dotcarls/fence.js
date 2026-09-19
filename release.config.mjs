// semantic-release (ADR-0013): the version comes from the Conventional Commits since the last
// release, the notes from the same commits. Before the checks, `tools/release/release.ts
// candidate` runs the commit plugins alone to name the release candidate; after every check
// passed, `npx semantic-release` runs them all to promote it.
//
// Publishing runs in `prepare`, before semantic-release creates the release tag: a publish that
// fails leaves no tag, so a re-run promotes the same version instead of skipping it. What is
// published is the tarball the checks verified, never a rebuild.
export default {
    branches: ['main'],
    tagFormat: 'v${version}',
    plugins: [
        ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
        ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
        [
            '@semantic-release/exec',
            {
                verifyReleaseCmd: 'node tools/release/release.ts verify ${nextRelease.version}',
                prepareCmd: 'node tools/release/release.ts publish ${nextRelease.version}',
            },
        ],
        [
            '@semantic-release/github',
            { successCommentCondition: false, failCommentCondition: false, releasedLabels: false },
        ],
    ],
};
