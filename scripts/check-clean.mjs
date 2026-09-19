// `npm run check:clean`: runs `npm run check` on exactly the committed tree, the way CI does: the
// HEAD commit exported with `git archive`, dependencies installed with `npm ci`, nothing from the
// working tree (uncommitted edits, untracked or ignored files, dist/, node_modules) carried over.
// The pre-push hook runs it, so what is pushed has passed the check CI will run (ADR-0009).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'fence-clean-'));
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' });
try {
    const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
        encoding: 'utf8',
    }).trim();
    console.log(`check:clean: exporting ${commit} to ${directory}`);
    execFileSync('sh', ['-c', `git archive HEAD | tar -x -C "${directory}"`], { stdio: 'inherit' });
    // The gate walker lists files through git, so the export is a repository of its own.
    run('git', ['init', '-q'], directory);
    run('git', ['add', '-A'], directory);
    run(
        'npm',
        ['ci', '--ignore-scripts', '--prefer-offline', '--no-audit', '--no-fund'],
        directory,
    );
    run('npm', ['run', 'check'], directory);
    console.log(`check:clean: ${commit} passes npm run check in a clean export`);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
