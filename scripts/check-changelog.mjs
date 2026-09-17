// Fails the release when CHANGELOG.md has no section for the version being released.
// A prerelease (2.0.0-beta.1) may share the section of the version it leads up to (2.0.0).
import { readFileSync } from 'node:fs';

const version = process.argv[2];
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

if (!version) {
    console.error('usage: node scripts/check-changelog.mjs <version>');
    process.exit(2);
}

const candidates = [version, version.split('-')[0]];
if (!candidates.some((candidate) => changelog.includes(`## [${candidate}]`))) {
    console.error(`CHANGELOG.md has no "## [${version}]" section; add one before releasing.`);
    process.exit(1);
}
