// CHANGELOG.md helpers for the release process (docs/toolchain/release-process.md).
//   node scripts/changelog.mjs check <version>   exit 1 unless the version has a section
//   node scripts/changelog.mjs notes <version>   print the section's body (the release notes)
// A prerelease (2.1.0-beta.1) may use the section of the version it leads to (2.1.0).
import { readFileSync } from 'node:fs';

const [command, version] = process.argv.slice(2);
if (!['check', 'notes'].includes(command) || !version) {
    console.error('usage: node scripts/changelog.mjs check|notes <version>');
    process.exit(2);
}

const lines = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split('\n');
const candidates = [version, version.split('-')[0]];

function section(v) {
    const start = lines.findIndex((line) => line.startsWith(`## [${v}]`));
    if (start < 0) return null;
    const end = lines.findIndex((line, i) => i > start && line.startsWith('## ['));
    return lines
        .slice(start + 1, end < 0 ? undefined : end)
        .join('\n')
        .trim();
}

const body = candidates.map(section).find((s) => s !== null);
if (body === undefined || body === '') {
    console.error(
        `CHANGELOG.md has no "## [${version}]" section with content; add one before releasing.`,
    );
    process.exit(1);
}
if (command === 'notes') console.log(body);
