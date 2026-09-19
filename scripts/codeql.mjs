// `npm run codeql`: CodeQL over exactly the files a commit would contain, with the CLI pinned in
// mise.toml and the query pack pinned here, the same ones CI runs, failing on any finding
// (ADR-0012). check:clean runs it on the exported HEAD, so the pre-push hook runs it too.
// Usage: node scripts/codeql.mjs [--sarif <path>]  (CI keeps the SARIF to upload it)
//
// Files: the gate walker's list (`git ls-files --cached --others --exclude-from=.gitignore`):
// tracked files plus untracked ones the root .gitignore does not ignore, copied to a temporary
// directory, so dist/, site/ and node_modules are never analyzed. check:clean runs it on an
// export of HEAD, where the two lists are the same.
// The query pack is fetched once into ~/.codeql/packages, by exact version.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// The pack codeql-action 4.38.1 bundles with CodeQL 2.27.0; change it with the CLI in mise.toml.
const QUERY_PACK = 'codeql/javascript-queries@2.4.5';
const SUITE = `${QUERY_PACK}:codeql-suites/javascript-security-and-quality.qls`;
const CATEGORY = '/language:javascript-typescript';

function sarifPath(args) {
    const usage = 'usage: node scripts/codeql.mjs [--sarif <path>]';
    if (args.length === 0) return null;
    const [flag, value, ...rest] = args[0].startsWith('--sarif=')
        ? ['--sarif', args[0].slice('--sarif='.length), ...args.slice(1)]
        : args;
    if (flag !== '--sarif' || !value || value.startsWith('-') || rest.length > 0) {
        console.error(usage);
        process.exit(2);
    }
    return resolve(value);
}
const keepSarif = sarifPath(process.argv.slice(2));

const quiet = (command, argv) =>
    execFileSync(command, argv, {
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

/** The CLI mise.toml pins: mise's own, else one on PATH of that exact version; nothing else. */
function pinnedCodeql() {
    const pinned = /^codeql\s*=\s*"([^"]+)"/m.exec(readFileSync('mise.toml', 'utf8'))?.[1];
    if (!pinned) throw new Error('mise.toml pins no codeql version');
    const found = [];
    const candidates = [() => quiet('mise', ['which', 'codeql']), () => 'codeql'];
    for (const candidate of candidates) {
        let binary;
        try {
            binary = candidate();
        } catch (error) {
            // mise refused (too old for min_version, untrusted, not installed): keep its reason
            const said = String(error.stderr ?? '')
                .trim()
                .split('\n')
                .slice(0, 2)
                .join(' / ');
            if (said) found.push(`mise said: ${said}`);
            continue;
        }
        try {
            const version = quiet(binary, ['version', '--format=terse']);
            if (version === pinned) return binary;
            found.push(`${binary} is ${version}`);
        } catch {
            // no such binary on PATH; try the next
        }
    }
    const seen = found.length > 0 ? ` (${found.join('; ')})` : '';
    throw new Error(
        `CodeQL ${pinned} (mise.toml) was not found${seen}; upgrade mise if it says so, then run mise install`,
    );
}

const work = mkdtempSync(join(tmpdir(), 'fence-codeql-'));
try {
    const codeql = pinnedCodeql();
    const files = quiet('git', [
        'ls-files',
        '-z',
        '--cached',
        '--others',
        '--exclude-from=.gitignore',
    ])
        .split('\0')
        .filter(Boolean);
    const source = join(work, 'source');
    for (const file of files) {
        try {
            mkdirSync(dirname(join(source, file)), { recursive: true });
            cpSync(file, join(source, file));
        } catch (error) {
            if (error.code !== 'ENOENT') throw error; // tracked but deleted in the working tree
        }
    }
    const database = join(work, 'db');
    const sarif = keepSarif ?? join(work, 'results.sarif');
    if (keepSarif) mkdirSync(dirname(keepSarif), { recursive: true });

    console.log(
        `codeql: ${files.length} files, CodeQL ${quiet(codeql, ['version', '--format=terse'])}, ${QUERY_PACK}`,
    );
    // CodeQL's own log is long; it is printed only when a step fails.
    for (const argv of [
        [
            'database',
            'create',
            database,
            '--language=javascript-typescript',
            `--source-root=${source}`,
            '--overwrite',
            '--threads=0',
        ],
        [
            'database',
            'analyze',
            database,
            SUITE,
            '--download',
            '--format=sarif-latest',
            `--sarif-category=${CATEGORY}`,
            `--output=${sarif}`,
            '--threads=0',
        ],
    ]) {
        try {
            quiet(codeql, argv);
        } catch (error) {
            process.stderr.write(`${error.stdout ?? ''}${error.stderr ?? ''}`);
            throw new Error(`codeql ${argv.slice(0, 2).join(' ')} failed`, { cause: error });
        }
    }

    const results = JSON.parse(readFileSync(sarif, 'utf8')).runs.flatMap((r) => r.results ?? []);
    for (const result of results) {
        const location = result.locations?.[0]?.physicalLocation;
        const where = `${location?.artifactLocation?.uri ?? '?'}:${location?.region?.startLine ?? '?'}`;
        console.error(`codeql: ${result.ruleId} at ${where}: ${result.message?.text ?? ''}`);
    }
    console.log(`codeql: ${results.length} finding${results.length === 1 ? '' : 's'}`);
    process.exitCode = results.length === 0 ? 0 : 1;
} catch (error) {
    console.error(`codeql: ${error.message}`);
    process.exitCode = 1;
} finally {
    rmSync(work, { recursive: true, force: true });
}
