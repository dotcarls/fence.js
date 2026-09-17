import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { parse as parseYaml } from 'yaml';

import type { Context, GatesConfig } from './types.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'site', 'coverage']);

/** Converts a repository glob (`**`, `*`, `?`) into an anchored regular expression. */
export function globToRegExp(glob: string): RegExp {
    let out = '^';
    for (let i = 0; i < glob.length; i++) {
        const ch = glob[i];
        if (ch === '*') {
            if (glob[i + 1] === '*') {
                const slashAfter = glob[i + 2] === '/';
                out += slashAfter ? '(?:.*/)?' : '.*';
                i += slashAfter ? 2 : 1;
            } else {
                out += '[^/]*';
            }
        } else if (ch === '?') {
            out += '[^/]';
        } else if (ch !== undefined) {
            out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }
    }
    return new RegExp(`${out}$`);
}

export function walk(root: string): string[] {
    const found: string[] = [];
    const visit = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) {
                    visit(join(dir, entry.name));
                }
            } else if (entry.isFile()) {
                found.push(relative(root, join(dir, entry.name)).split(sep).join('/'));
            }
        }
    };
    visit(root);
    return found.sort();
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function splitFrontMatter(text: string): {
    data: Record<string, unknown> | null;
    body: string;
} {
    const match = FRONT_MATTER.exec(text);
    if (!match) {
        return { data: null, body: text };
    }
    const parsed: unknown = parseYaml(match[1] ?? '');
    const data =
        typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    return { data, body: text.slice(match[0].length) };
}

/** GitHub-style heading slug: lowercase, punctuation dropped, spaces to hyphens. */
export function slugify(heading: string): string {
    return heading
        .toLowerCase()
        .replace(/`/g, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/ /g, '-');
}

/** Removes fenced code blocks and inline code so their contents are not read as links or ids. */
export function withoutCode(markdown: string): string {
    return markdown
        .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
        .replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
}

export function createContext(root: string, config: GatesConfig, todayIso: string): Context {
    const files = walk(root);
    const fileSet = new Set(files);
    const textCache = new Map<string, string>();
    const fmCache = new Map<string, { data: Record<string, unknown> | null; body: string }>();
    const idPatterns = Object.values(config.ids);

    const read = (relPath: string): string => {
        let text = textCache.get(relPath);
        if (text === undefined) {
            text = readFileSync(join(root, relPath), 'utf8');
            textCache.set(relPath, text);
        }
        return text;
    };
    const split = (relPath: string) => {
        let entry = fmCache.get(relPath);
        if (!entry) {
            entry = splitFrontMatter(read(relPath));
            fmCache.set(relPath, entry);
        }
        return entry;
    };
    const matches = (relPath: string, patterns: readonly string[]): boolean =>
        patterns.some((pattern) => globToRegExp(pattern).test(relPath));

    return {
        root,
        config,
        files,
        read,
        exists: (relPath) => fileSet.has(relPath) || safeExists(join(root, relPath)),
        frontMatter: (relPath) => split(relPath).data,
        body: (relPath) => split(relPath).body,
        headings: (relPath) =>
            [...withoutCode(split(relPath).body).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)].map((m) =>
                slugify(m[1] ?? ''),
            ),
        matches,
        select: (include, exclude = []) =>
            files.filter((f) => matches(f, include) && !matches(f, exclude)),
        resolveId: (id) => {
            for (const { pattern, dir } of idPatterns) {
                if (new RegExp(`^${pattern}$`).test(id)) {
                    const hit = files.find(
                        (f) => f.startsWith(`${dir}/${id}-`) && f.endsWith('.md'),
                    );
                    return hit ?? null;
                }
            }
            return null;
        },
        today: () => todayIso,
    };
}

function safeExists(absPath: string): boolean {
    try {
        statSync(absPath);
        return true;
    } catch {
        return false;
    }
}

/** Resolves `path#anchor`, `FJ-NNNN`, `ADR-NNNN` or a plain path against the repository. */
export function resolveReference(
    ctx: Context,
    reference: string,
    fromFile?: string,
): string | null {
    const [target, anchor] = reference.split('#', 2);
    let file: string | null;
    if (target === undefined || target === '') {
        file = fromFile ?? null;
    } else if (ctx.resolveId(target)) {
        file = ctx.resolveId(target);
    } else {
        const relative = fromFile ? normalizePath(join(fromFile, '..', target)) : null;
        const fromRoot = normalizePath(target);
        file = relative && ctx.exists(relative) ? relative : ctx.exists(fromRoot) ? fromRoot : null;
    }
    if (!file) {
        return null;
    }
    if (anchor !== undefined && anchor !== '' && file.endsWith('.md')) {
        if (!ctx.headings(file).includes(anchor)) {
            return null;
        }
    }
    return file;
}

export function normalizePath(p: string): string {
    const parts: string[] = [];
    for (const part of p.split(/[\\/]+/)) {
        if (part === '' || part === '.') continue;
        if (part === '..') parts.pop();
        else parts.push(part);
    }
    return parts.join('/');
}
