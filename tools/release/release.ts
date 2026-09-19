/**
 * The automated release from trunk (ADR-0013). `release.yml` runs it on every push to `main`:
 *
 *   node tools/release/release.ts candidate [--dry-run]
 *     Before the checks: the version the commits since the last release warrant, if any, tagged
 *     on HEAD as the next release candidate `vX.Y.Z-rc.N` and pushed. `--dry-run` only prints it.
 *   node tools/release/release.ts verify <version>
 *   node tools/release/release.ts publish <version>
 *     After every check passed, from semantic-release (`release.config.mjs`): the version it
 *     computed must be the candidate's, and the tarball the checks verified is published. A
 *     version already published with the same bytes is not published again.
 *
 * Runs on Node's type stripping, so it imports nothing relative and uses erasable syntax only.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import semanticRelease from 'semantic-release';
import type { Config, Options, PluginSpec } from 'semantic-release';

const PACKAGE = 'fence.js';
/** The plugins that only read commits; the candidate runs these alone. */
const COMMIT_PLUGINS = [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
];

type Env = Record<string, string | undefined>;

const git = (cwd: string, ...args: string[]): string =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** The last release reachable from HEAD: the highest `vX.Y.Z` tag that is not a prerelease. */
export function lastRelease(cwd: string): string | null {
    try {
        return git(
            cwd,
            'describe',
            '--tags',
            '--abbrev=0',
            '--match',
            'v[0-9]*',
            '--exclude',
            '*-*',
        ).replace(/^v/, '');
    } catch {
        return null;
    }
}

/**
 * The version the commits since the last release warrant, or null when none does: semantic-release
 * run dry with the configuration's commit plugins only, so nothing is tagged or published.
 */
export async function nextVersion(options: {
    cwd: string;
    env: Env;
    repositoryUrl?: string;
    log?: Config['stdout'];
}): Promise<string | null> {
    const { cwd, env, repositoryUrl, log } = options;
    const configUrl = pathToFileURL(join(cwd, 'release.config.mjs')).href;
    const config = ((await import(configUrl)) as { default: Options }).default;
    const plugins = (config.plugins ?? []).filter((plugin: PluginSpec) =>
        COMMIT_PLUGINS.includes(Array.isArray(plugin) ? plugin[0] : plugin),
    );
    const result = await semanticRelease(
        {
            ...config,
            plugins,
            dryRun: true,
            ci: false,
            ...(repositoryUrl ? { repositoryUrl } : {}),
        },
        { cwd, env: env as Record<string, string>, ...(log ? { stdout: log, stderr: log } : {}) },
    );
    return result ? result.nextRelease.version : null;
}

const RC = /-rc\.(\d+)$/;
const rcNumber = (tag: string): number => Number(RC.exec(tag)?.[1] ?? 0);

/**
 * The release candidate tag for `version` on HEAD: the one HEAD already carries (a re-run), else
 * one more than the highest candidate for that version so far. Creates it locally when new.
 */
export function candidateTag(cwd: string, version: string): { tag: string; created: boolean } {
    const pattern = `v${version}-rc.*`;
    const highest = (tags: string) =>
        tags
            .split('\n')
            .filter((tag) => RC.test(tag))
            .sort((a, b) => rcNumber(b) - rcNumber(a))[0];
    const onHead = highest(git(cwd, 'tag', '--points-at', 'HEAD', '--list', pattern));
    if (onHead) return { tag: onHead, created: false };
    const previous = highest(git(cwd, 'tag', '--list', pattern));
    const tag = `v${version}-rc.${String(previous ? rcNumber(previous) + 1 : 1)}`;
    git(cwd, 'tag', tag, 'HEAD');
    return { tag, created: true };
}

export interface Candidate {
    /** Whether the commits warrant a release. */
    release: boolean;
    /** The version a release would carry, else the last release (for the documentation). */
    version: string | null;
    /** The release candidate tag on HEAD, when there is a release. */
    tag: string | null;
}

export async function candidate(options: {
    cwd: string;
    env: Env;
    push: boolean;
    remote?: string;
    repositoryUrl?: string;
    log?: Config['stdout'];
}): Promise<Candidate> {
    const { cwd, push, remote = 'origin' } = options;
    const version = await nextVersion(options);
    if (!version) return { release: false, version: lastRelease(cwd), tag: null };
    if (!push) return { release: true, version, tag: null };
    const { tag, created } = candidateTag(cwd, version);
    if (created) git(cwd, 'push', remote, `refs/tags/${tag}`);
    return { release: true, version, tag };
}

/** The name and version inside a packed tarball. */
export function tarballManifest(tarball: string): { name: string; version: string } {
    const manifest = execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], {
        encoding: 'utf8',
    });
    return JSON.parse(manifest) as { name: string; version: string };
}

/** Refuses to release anything but the version the checks verified, in the tarball they packed. */
export function verify(version: string, env: Env): string {
    const expected = env.FENCE_VERSION;
    const tarball = env.FENCE_TARBALL;
    if (!expected || !tarball) throw new Error('FENCE_VERSION and FENCE_TARBALL must be set');
    if (version !== expected) {
        throw new Error(
            `semantic-release computed ${version}, but the checks verified ${expected}; not releasing`,
        );
    }
    const manifest = tarballManifest(tarball);
    if (manifest.name !== PACKAGE || manifest.version !== version) {
        throw new Error(
            `${tarball} holds ${manifest.name}@${manifest.version}, not ${PACKAGE}@${version}`,
        );
    }
    return tarball;
}

export type Npm = (args: string[]) => { ok: boolean; stdout: string; stderr: string };

const npmCli: Npm = (args) => {
    try {
        const stdout = execFileSync('npm', args, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { ok: true, stdout, stderr: '' };
    } catch (error) {
        const failed = error as { stdout?: string; stderr?: string };
        return { ok: false, stdout: failed.stdout ?? '', stderr: failed.stderr ?? '' };
    }
};

/**
 * Publishes the verified tarball under `latest` with provenance, through npm trusted publishing.
 * A version npm already has is left alone when its bytes are these and refused otherwise, so a
 * re-run after a publish whose tag step failed completes instead of failing.
 */
export function publish(version: string, env: Env, npm: Npm = npmCli): 'published' | 'present' {
    const tarball = verify(version, env);
    const integrity = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`;
    const view = npm(['view', `${PACKAGE}@${version}`, 'dist.integrity']);
    if (view.ok && view.stdout.trim() !== '') {
        if (view.stdout.trim() === integrity) return 'present';
        throw new Error(`${PACKAGE}@${version} is already on npm with different contents`);
    }
    if (!view.ok && !/E404|404 Not Found/.test(view.stderr)) {
        throw new Error(`npm view ${PACKAGE}@${version} failed: ${view.stderr.trim()}`);
    }
    const result = npm([
        'publish',
        tarball,
        '--provenance',
        '--access',
        'public',
        '--tag',
        'latest',
    ]);
    if (!result.ok) throw new Error(`npm publish failed:\n${result.stderr.trim()}`);
    return 'published';
}

async function main(argv: string[], env: Env): Promise<void> {
    const [command, version] = argv;
    if (command === 'candidate') {
        const dryRun = argv.includes('--dry-run');
        const result = await candidate({ cwd: process.cwd(), env, push: !dryRun });
        console.log(
            result.release
                ? `release: ${result.version ?? ''}${result.tag ? `, candidate ${result.tag}` : ''}`
                : `release: none warranted (last release ${result.version ?? 'none'})`,
        );
        if (env.GITHUB_OUTPUT && !dryRun) {
            appendFileSync(
                env.GITHUB_OUTPUT,
                `release=${String(result.release)}\nversion=${result.version ?? ''}\ntag=${result.tag ?? ''}\n`,
            );
        }
        return;
    }
    if ((command === 'verify' || command === 'publish') && version) {
        if (command === 'verify') verify(version, env);
        else console.log(`${PACKAGE}@${version}: ${publish(version, env)}`);
        return;
    }
    throw new Error(
        'usage: node tools/release/release.ts candidate [--dry-run] | verify|publish <version>',
    );
}

if (import.meta.main) {
    main(process.argv.slice(2), process.env).catch((error: unknown) => {
        console.error(`release: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
    });
}
