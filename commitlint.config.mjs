// Every commit message is a Conventional Commit (https://www.conventionalcommits.org/en/v1.0.0/),
// because the release is computed from them: `fix:` and `perf:` release a patch, `feat:` a minor,
// `!` or a `BREAKING CHANGE:` footer a major, and every other type nothing (ADR-0013). The
// commit-msg hook checks each commit locally; CI checks pull requests and pushes to main.
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Dependabot's bodies carry long release-note links; a long line is worth a warning only.
        'body-max-line-length': [1, 'always', 100],
        'footer-max-line-length': [1, 'always', 100],
    },
};
