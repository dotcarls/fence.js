/*
 * The automated release (ADR-0013) on real git repositories with a local bare remote: which
 * version a push warrants, how release candidates are numbered, that a failed publish leaves no
 * release tag, and what `verify` and `publish` accept. The GitHub and npm ends run only in CI.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';

import semanticRelease from 'semantic-release';
import { afterEach, describe, expect, test } from 'vitest';

import { candidate, publish, verify, type Npm } from '../../tools/release/release.js';

const realRoot = join(import.meta.dirname, '../..');
const SLOW = 60_000;

// Nothing from the machine or the CI runner may steer semantic-release (it reads the branch from
// GITHUB_* variables) or git (a global hook or signing setting).
const env = {
    PATH: process.env.PATH,
    HOME: tmpdir(),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
};

// semantic-release types its log streams as terminals; it only ever writes to them.
const quiet = new Writable({
    write(_chunk, _encoding, done) {
        done();
    },
}) as unknown as NodeJS.WriteStream;

const roots: string[] = [];
afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

interface Repo {
    work: string;
    remoteUrl: string;
    git: (...args: string[]) => string;
    commit: (message: string) => void;
    remoteTags: () => string[];
}

function repo(): Repo {
    const root = mkdtempSync(join(tmpdir(), 'fence-release-'));
    roots.push(root);
    const remote = join(root, 'remote.git');
    const work = join(root, 'work');
    const run = (cwd: string, args: string[]) =>
        execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
    run(root, ['init', '-q', '--bare', '-b', 'main', remote]);
    mkdirSync(work);
    run(work, ['init', '-q', '-b', 'main']);
    run(work, ['remote', 'add', 'origin', remote]);
    cpSync(join(realRoot, 'release.config.mjs'), join(work, 'release.config.mjs'));
    let files = 0;
    const git = (...args: string[]) => run(work, args);
    return {
        work,
        remoteUrl: `file://${remote}`,
        git,
        commit(message) {
            writeFileSync(join(work, `file-${String(files++)}`), message);
            git('add', '-A');
            git('commit', '-q', '-m', message);
            git('push', '-q', 'origin', 'main');
        },
        remoteTags: () =>
            git('ls-remote', '--tags', 'origin')
                .split('\n')
                .filter(Boolean)
                .map((line) => line.replace(/^.*refs\/tags\//, ''))
                .sort(),
    };
}

/** A repository whose last release is v1.0.0. */
function released(): Repo {
    const r = repo();
    r.commit('chore: start');
    r.git('tag', 'v1.0.0');
    r.git('push', '-q', 'origin', 'v1.0.0');
    return r;
}

const next = (r: Repo) =>
    candidate({ cwd: r.work, env, push: true, repositoryUrl: r.remoteUrl, log: quiet });

describe('candidate', () => {
    test(
        'a push that warrants no release is not tagged and names the last release',
        async () => {
            const r = released();
            r.commit('docs: explain');
            r.commit('chore: tidy');
            r.commit('build(deps-dev): bump the dev-dependencies group with 3 updates');
            r.commit('ci(deps): bump the actions group with 2 updates');
            expect(await next(r)).toEqual({ release: false, version: '1.0.0', tag: null });
            expect(r.remoteTags()).toEqual(['v1.0.0']);
        },
        SLOW,
    );

    test(
        'tags the next release candidate on HEAD and pushes it; a re-run reuses it',
        async () => {
            const r = released();
            r.commit('fix: one');
            expect(await next(r)).toEqual({ release: true, version: '1.0.1', tag: 'v1.0.1-rc.1' });
            expect(await next(r)).toEqual({ release: true, version: '1.0.1', tag: 'v1.0.1-rc.1' });
            expect(r.remoteTags()).toEqual(['v1.0.0', 'v1.0.1-rc.1']);
            expect(r.git('rev-parse', 'v1.0.1-rc.1^{commit}')).toBe(r.git('rev-parse', 'HEAD'));
        },
        SLOW,
    );

    test(
        'numbers candidates per version; earlier candidates do not change the version',
        async () => {
            const r = released();
            r.commit('fix: one');
            await next(r);
            r.commit('fix: two');
            expect((await next(r)).tag).toBe('v1.0.1-rc.2');
            r.commit('feat: three');
            expect(await next(r)).toEqual({ release: true, version: '1.1.0', tag: 'v1.1.0-rc.1' });
            r.commit('feat!: four');
            expect((await next(r)).tag).toBe('v2.0.0-rc.1');
        },
        SLOW,
    );

    test(
        'a runtime dependency update releases a patch; a BREAKING CHANGE footer a major',
        async () => {
            const r = released();
            r.commit('fix(deps): bump a runtime dependency');
            expect((await next(r)).version).toBe('1.0.1');
            r.commit('refactor: drop the old format\n\nBREAKING CHANGE: format 1 is refused');
            expect((await next(r)).version).toBe('2.0.0');
        },
        SLOW,
    );

    test(
        'a revert releases a patch',
        async () => {
            const r = released();
            r.commit('revert: feat: something\n\nThis reverts commit 1234567.');
            expect((await next(r)).version).toBe('1.0.1');
        },
        SLOW,
    );

    test(
        'a dry run names the version and tags nothing',
        async () => {
            const r = released();
            r.commit('perf: faster');
            expect(
                await candidate({
                    cwd: r.work,
                    env,
                    push: false,
                    repositoryUrl: r.remoteUrl,
                    log: quiet,
                }),
            ).toEqual({ release: true, version: '1.0.1', tag: null });
            expect(r.remoteTags()).toEqual(['v1.0.0']);
        },
        SLOW,
    );
});

describe('promotion', () => {
    // The real configuration's commit plugins and its exec step, with a stand-in for the publish.
    const promote = (r: Repo, prepareCmd: string) =>
        semanticRelease(
            {
                branches: ['main'],
                tagFormat: 'v${version}',
                repositoryUrl: r.remoteUrl,
                ci: false,
                plugins: [
                    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
                    [
                        '@semantic-release/release-notes-generator',
                        { preset: 'conventionalcommits' },
                    ],
                    ['@semantic-release/exec', { prepareCmd }],
                ],
            },
            { cwd: r.work, env, stdout: quiet, stderr: quiet },
        );

    test('the configuration publishes in prepare, before the release tag exists', async () => {
        const configUrl = pathToFileURL(join(realRoot, 'release.config.mjs')).href;
        const config = ((await import(configUrl)) as { default: unknown }).default as {
            plugins: [string, Record<string, string>][];
        };
        const exec = config.plugins.find(([name]) => name === '@semantic-release/exec');
        expect(exec?.[1].prepareCmd).toMatch(/release\.ts publish/);
        expect(exec?.[1].publishCmd).toBeUndefined();
    });

    test(
        'a failed publish leaves no release tag, and a re-run promotes the same version onto the candidate',
        async () => {
            const r = released();
            r.commit('feat: new');
            const { tag } = await next(r);
            await expect(promote(r, 'exit 1')).rejects.toThrow();
            expect(r.remoteTags()).toEqual(['v1.0.0', 'v1.1.0-rc.1']);
            const result = await promote(r, 'exit 0');
            expect(result && result.nextRelease.version).toBe('1.1.0');
            expect(r.remoteTags()).toEqual(['v1.0.0', 'v1.1.0', 'v1.1.0-rc.1']);
            r.git('fetch', '-q', '--tags', 'origin');
            expect(r.git('rev-parse', 'v1.1.0^{commit}')).toBe(
                r.git('rev-parse', `${tag ?? ''}^{commit}`),
            );
            expect(await next(r)).toEqual({ release: false, version: '1.1.0', tag: null });
        },
        SLOW,
    );
});

describe('verify and publish', () => {
    function tarball(name: string, version: string): string {
        const root = mkdtempSync(join(tmpdir(), 'fence-tarball-'));
        roots.push(root);
        mkdirSync(join(root, 'package'));
        writeFileSync(join(root, 'package', 'package.json'), JSON.stringify({ name, version }));
        execFileSync('tar', ['-czf', join(root, 'pkg.tgz'), '-C', root, 'package']);
        return join(root, 'pkg.tgz');
    }
    const released = (version: string, tgz: string) => ({
        FENCE_VERSION: version,
        FENCE_TARBALL: tgz,
    });

    test('refuses a version other than the one the checks verified, or a tarball that is not it', () => {
        const tgz = tarball('fence.js', '1.2.3');
        expect(verify('1.2.3', released('1.2.3', tgz))).toBe(tgz);
        expect(() => verify('1.2.4', released('1.2.3', tgz))).toThrow(/checks verified 1\.2\.3/);
        expect(() => verify('1.2.3', released('1.2.3', tarball('other', '1.2.3')))).toThrow(
            /holds other@1\.2\.3/,
        );
        expect(() => verify('1.2.3', { FENCE_VERSION: '1.2.3' })).toThrow(/must be set/);
    });

    test('publishes a new version with provenance under latest', () => {
        const tgz = tarball('fence.js', '1.2.3');
        const calls: string[][] = [];
        const npm: Npm = (args) => {
            calls.push(args);
            return args[0] === 'view'
                ? { ok: false, stdout: '', stderr: 'npm error code E404' }
                : { ok: true, stdout: '', stderr: '' };
        };
        expect(publish('1.2.3', released('1.2.3', tgz), npm)).toBe('published');
        expect(calls[1]).toEqual([
            'publish',
            tgz,
            '--provenance',
            '--access',
            'public',
            '--tag',
            'latest',
        ]);
    });

    test('leaves a version npm already has with these bytes, and refuses one with other bytes', () => {
        const tgz = tarball('fence.js', '1.2.3');
        const integrity = `sha512-${execFileSync('openssl', ['dgst', '-sha512', '-binary', tgz]).toString('base64')}`;
        const having =
            (value: string): Npm =>
            (args) =>
                args[0] === 'view'
                    ? { ok: true, stdout: `${value}\n`, stderr: '' }
                    : { ok: false, stdout: '', stderr: 'must not publish' };
        expect(publish('1.2.3', released('1.2.3', tgz), having(integrity))).toBe('present');
        expect(() => publish('1.2.3', released('1.2.3', tgz), having('sha512-other'))).toThrow(
            /different contents/,
        );
    });

    test('stops when npm cannot say whether the version exists', () => {
        const tgz = tarball('fence.js', '1.2.3');
        const down: Npm = () => ({ ok: false, stdout: '', stderr: 'npm error code ECONNRESET' });
        expect(() => publish('1.2.3', released('1.2.3', tgz), down)).toThrow(/ECONNRESET/);
    });
});
