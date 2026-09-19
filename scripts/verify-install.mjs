// `npm run verify:install`, the first step of `npm run check`: node_modules must be exactly what
// package-lock.json describes, because a drifted install (an `npm install` of another version,
// a `git pull` that changed the lockfile) changes what every other target runs (ADR-0009).
// Compares npm's record of the install (node_modules/.package-lock.json) with the lockfile, entry
// by entry: version and integrity. Optional packages for other platforms may be absent.
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8')).packages ?? {};
if (!existsSync('node_modules/.package-lock.json')) {
    console.error(
        'verify:install: node_modules is missing or was not installed by npm; run npm ci',
    );
    process.exit(1);
}
const wanted = read('package-lock.json');
const installed = read('node_modules/.package-lock.json');
const problems = [];

for (const [path, want] of Object.entries(wanted)) {
    if (path === '') continue;
    const have = installed[path];
    if (!have) {
        if (!want.optional && !want.devOptional) problems.push(`${path}: missing`);
        continue;
    }
    if (have.version !== want.version) {
        problems.push(`${path}: installed ${have.version}, lockfile ${want.version}`);
    } else if (want.integrity && have.integrity && have.integrity !== want.integrity) {
        problems.push(`${path}: integrity differs from the lockfile`);
    }
}
for (const path of Object.keys(installed)) {
    if (!(path in wanted)) problems.push(`${path}: installed but not in the lockfile`);
}

if (problems.length > 0) {
    console.error(
        `verify:install: node_modules does not match package-lock.json; run npm ci\n  ${problems.join('\n  ')}`,
    );
    process.exit(1);
}
console.log(
    `verify:install: node_modules matches package-lock.json (${Object.keys(installed).length} packages)`,
);
