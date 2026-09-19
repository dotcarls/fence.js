// `npm run check:package`: builds dist/ from a clean tree, packs it once without lifecycle
// scripts, and lints that one tarball with publint and attw. The result never depends on what
// dist/ held before, and packing does not run `prepare`, so .git/hooks is left alone (ADR-0009).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bin = (name) => join('node_modules', '.bin', name);
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit' });

const directory = mkdtempSync(join(tmpdir(), 'fence-pack-'));
try {
    run('npm', ['run', 'build']);
    const packed = execFileSync(
        'npm',
        ['pack', '--ignore-scripts', '--json', '--pack-destination', directory],
        { encoding: 'utf8' },
    );
    const [{ filename }] = JSON.parse(packed);
    const tarball = join(directory, filename);
    run(bin('publint'), ['run', tarball, '--strict']);
    run(bin('attw'), [tarball, '--profile', 'esm-only']);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
