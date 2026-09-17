import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';

import { applyBlocks, hasMarkers, loadLexicon, loadOntology } from './generate.js';
import { resolveReference, withoutCode } from './repo.js';
import type { Finding, Gate } from './types.js';

const finding = (
    gate: string,
    file: string,
    message: string,
    severity: Finding['severity'] = 'error',
): Finding => ({
    gate,
    file,
    message,
    severity,
});

/** Front matter validates against its schema; required sections are present. */
export const schemas: Gate = {
    name: 'schemas',
    run(ctx) {
        const out: Finding[] = [];
        const ajv = new Ajv2020({ allErrors: true, strict: false });
        const validators = new Map<string, ValidateFunction>();
        for (const rule of ctx.config.schemas) {
            let validate = validators.get(rule.schema);
            if (!validate) {
                validate = ajv.compile(
                    JSON.parse(readFileSync(join(ctx.root, rule.schema), 'utf8')) as object,
                );
                validators.set(rule.schema, validate);
            }
            for (const file of ctx.select(
                [rule.glob],
                [...(rule.exclude ?? []), ...ctx.config.markdown.exclude],
            )) {
                const data = ctx.frontMatter(file);
                if (data === null) {
                    out.push(
                        finding('schemas', file, `missing front matter (schema ${rule.schema})`),
                    );
                    continue;
                }
                if (!validate(data)) {
                    for (const err of validate.errors ?? []) {
                        out.push(
                            finding(
                                'schemas',
                                file,
                                `front matter ${err.instancePath || '/'} ${err.message ?? 'invalid'}`,
                            ),
                        );
                    }
                }
                const headings = ctx.headings(file);
                for (const section of rule.requiredSections ?? []) {
                    if (!headings.includes(section.toLowerCase().replace(/\s+/g, '-'))) {
                        out.push(
                            finding('schemas', file, `missing required section '## ${section}'`),
                        );
                    }
                }
            }
        }
        return out;
    },
};

const LINK = /!?\[[^\]]*\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g;

/** Every relative Markdown link resolves (anchors included); every bare id resolves. */
export const xref: Gate = {
    name: 'xref',
    run(ctx) {
        const out: Finding[] = [];
        const idRegex = new RegExp(
            `\\b(?:${Object.values(ctx.config.ids)
                .map((i) => i.pattern)
                .join('|')})\\b`,
            'g',
        );
        for (const file of ctx.select(ctx.config.markdown.include, ctx.config.markdown.exclude)) {
            const text = withoutCode(ctx.read(file));
            for (const match of text.matchAll(LINK)) {
                const target = match[1] ?? '';
                if (/^[a-z]+:/i.test(target) || target.startsWith('mailto:')) continue;
                if (!resolveReference(ctx, target, file)) {
                    out.push(finding('xref', file, `link does not resolve: ${target}`));
                }
            }
            for (const match of text.matchAll(idRegex)) {
                if (!ctx.resolveId(match[0])) {
                    out.push(finding('xref', file, `id does not resolve: ${match[0]}`));
                }
            }
        }
        return out;
    },
};

interface Criterion {
    text: string;
    satisfied: boolean;
    evidence?: string | null;
}

/** Tracker semantics: names, relations, done means evidence, in-progress means checkpointed. */
export const workItems: Gate = {
    name: 'work-items',
    run(ctx) {
        const out: Finding[] = [];
        const files = ctx.select(['docs/work/items/FJ-*.md']);
        const byId = new Map<string, Record<string, unknown>>();
        for (const file of files) {
            const fm = ctx.frontMatter(file);
            if (fm) byId.set(String(fm.id), fm);
        }
        const checkpoint = ctx.exists('docs/work/CHECKPOINT.md')
            ? ctx.read('docs/work/CHECKPOINT.md')
            : '';
        for (const file of files) {
            const fm = ctx.frontMatter(file);
            if (!fm) continue;
            const id = String(fm.id);
            if (!file.startsWith(`docs/work/items/${id}-`)) {
                out.push(finding('work-items', file, `file name does not start with its id ${id}`));
            }
            const related = (key: string): string[] =>
                Array.isArray(fm[key]) ? fm[key].map(String) : [];
            if (typeof fm.parent === 'string' && !byId.has(fm.parent)) {
                out.push(finding('work-items', file, `parent ${fm.parent} does not exist`));
            }
            for (const other of related('blocks')) {
                const peer = byId.get(other);
                if (!peer)
                    out.push(finding('work-items', file, `blocks ${other}, which does not exist`));
                else if (!(Array.isArray(peer.blocked_by) && peer.blocked_by.includes(id)))
                    out.push(
                        finding(
                            'work-items',
                            file,
                            `blocks ${other} but ${other} does not list blocked_by ${id}`,
                        ),
                    );
            }
            for (const other of related('blocked_by')) {
                const peer = byId.get(other);
                if (!peer)
                    out.push(
                        finding('work-items', file, `blocked_by ${other}, which does not exist`),
                    );
                else if (!(Array.isArray(peer.blocks) && peer.blocks.includes(id)))
                    out.push(
                        finding(
                            'work-items',
                            file,
                            `blocked_by ${other} but ${other} does not list blocks ${id}`,
                        ),
                    );
            }
            if (
                fm.status === 'blocked' &&
                related('blocked_by').length === 0 &&
                !fm.blocked_reason
            ) {
                out.push(
                    finding('work-items', file, 'blocked without blocked_by or blocked_reason'),
                );
            }
            const criteria = Array.isArray(fm.acceptance_criteria)
                ? (fm.acceptance_criteria as Criterion[])
                : [];
            if (fm.status === 'done') {
                for (const [i, c] of criteria.entries()) {
                    if (!c.satisfied)
                        out.push(
                            finding(
                                'work-items',
                                file,
                                `done but criterion ${String(i + 1)} is not satisfied`,
                            ),
                        );
                    if (!c.evidence)
                        out.push(
                            finding(
                                'work-items',
                                file,
                                `done but criterion ${String(i + 1)} has no evidence`,
                            ),
                        );
                    else if (!resolveReference(ctx, c.evidence))
                        out.push(
                            finding(
                                'work-items',
                                file,
                                `criterion ${String(i + 1)} evidence does not resolve: ${c.evidence}`,
                            ),
                        );
                }
                for (const other of related('blocked_by')) {
                    const peer = byId.get(other);
                    if (peer && peer.status !== 'done' && peer.status !== 'cancelled')
                        out.push(
                            finding(
                                'work-items',
                                file,
                                `done while blocked_by ${other} is still ${String(peer.status)}`,
                            ),
                        );
                }
            }
            if (fm.status === 'in-progress' && !checkpoint.includes(id)) {
                out.push(
                    finding(
                        'work-items',
                        file,
                        `in-progress but not mentioned in docs/work/CHECKPOINT.md`,
                    ),
                );
            }
            const links =
                typeof fm.links === 'object' && fm.links !== null
                    ? (fm.links as Record<string, unknown>)
                    : {};
            for (const [group, values] of Object.entries(links)) {
                if (!Array.isArray(values)) continue;
                for (const value of values.map(String)) {
                    if (!resolveReference(ctx, value))
                        out.push(
                            finding(
                                'work-items',
                                file,
                                `links.${group} does not resolve: ${value}`,
                            ),
                        );
                }
            }
        }
        return out;
    },
};

/** The resume pointer is still true. */
export const checkpoint: Gate = {
    name: 'checkpoint',
    run(ctx) {
        const file = 'docs/work/CHECKPOINT.md';
        if (!ctx.exists(file)) return [finding('checkpoint', file, 'missing')];
        const out: Finding[] = [];
        const fm = ctx.frontMatter(file) ?? {};
        const inProgress = Array.isArray(fm.in_progress_items)
            ? fm.in_progress_items.map(String)
            : [];
        for (const id of inProgress) {
            const target = ctx.resolveId(id);
            if (!target) {
                out.push(
                    finding(
                        'checkpoint',
                        file,
                        `in_progress_items names ${id}, which does not exist`,
                    ),
                );
                continue;
            }
            const status = String(ctx.frontMatter(target)?.status);
            if (status !== 'in-progress')
                out.push(
                    finding(
                        'checkpoint',
                        file,
                        `in_progress_items names ${id}, which is ${status}`,
                    ),
                );
        }
        const everyInProgress = ctx
            .select(['docs/work/items/FJ-*.md'])
            .filter((f) => ctx.frontMatter(f)?.status === 'in-progress')
            .map((f) => String(ctx.frontMatter(f)?.id));
        for (const id of everyInProgress) {
            if (!inProgress.includes(id))
                out.push(
                    finding(
                        'checkpoint',
                        file,
                        `${id} is in-progress but not in in_progress_items`,
                    ),
                );
        }
        const nextAction = typeof fm.next_action === 'string' ? fm.next_action : '';
        const named = nextAction.match(/FJ-\d{4}/g) ?? [];
        if (inProgress.length > 0 && named.length === 0) {
            out.push(
                finding(
                    'checkpoint',
                    file,
                    'next_action names no FJ id while items are in progress',
                ),
            );
        }
        for (const id of named) {
            const target = ctx.resolveId(id);
            const status = target ? String(ctx.frontMatter(target)?.status) : 'missing';
            if (!target || status === 'done' || status === 'cancelled')
                out.push(
                    finding('checkpoint', file, `next_action names ${id}, which is ${status}`),
                );
        }
        if (typeof fm.updated === 'string' && fm.updated > ctx.today()) {
            out.push(finding('checkpoint', file, `updated ${fm.updated} is in the future`));
        }
        return out;
    },
};

/** Every governed document is reachable from the roots by following links. */
export const reachability: Gate = {
    name: 'reachability',
    run(ctx) {
        const { roots, mustReach, exclude } = ctx.config.reachability;
        const seen = new Set<string>();
        const queue = roots.filter((r) => ctx.exists(r));
        while (queue.length > 0) {
            const file = queue.shift();
            if (!file || seen.has(file)) continue;
            seen.add(file);
            if (!file.endsWith('.md')) continue;
            const text = withoutCode(ctx.read(file));
            for (const match of text.matchAll(LINK)) {
                const target = match[1] ?? '';
                if (/^[a-z]+:/i.test(target)) continue;
                const resolved = resolveReference(ctx, target, file);
                if (resolved && !seen.has(resolved)) queue.push(resolved);
            }
            for (const id of text.match(/\b(?:FJ|ADR)-\d{4}\b/g) ?? []) {
                const resolved = ctx.resolveId(id);
                if (resolved && !seen.has(resolved)) queue.push(resolved);
            }
        }
        return ctx
            .select(mustReach, [...exclude, ...ctx.config.markdown.exclude])
            .filter((f) => !seen.has(f))
            .map((f) => finding('reachability', f, `not reachable from ${roots.join(' or ')}`));
    },
};

/** Generated blocks equal a fresh render. */
export const generated: Gate = {
    name: 'generated',
    run(ctx) {
        const out: Finding[] = [];
        for (const [file, names] of Object.entries(ctx.config.generated)) {
            if (!ctx.exists(file)) {
                out.push(finding('generated', file, 'file with generated blocks is missing'));
                continue;
            }
            const text = ctx.read(file);
            for (const name of names) {
                if (!hasMarkers(text, name))
                    out.push(finding('generated', file, `missing markers for block '${name}'`));
            }
            if (applyBlocks(ctx, text, names) !== text)
                out.push(
                    finding('generated', file, 'generated blocks are stale; run npm run gates:fix'),
                );
        }
        return out;
    },
    fix(ctx) {
        const rewritten: string[] = [];
        for (const [file, names] of Object.entries(ctx.config.generated)) {
            if (!ctx.exists(file)) continue;
            const text = ctx.read(file);
            const next = applyBlocks(ctx, text, names);
            if (next !== text) {
                writeFileSync(join(ctx.root, file), next);
                rewritten.push(file);
            }
        }
        return rewritten;
    },
};

const ANNOTATION = /@fence:([a-z-]+)\(([^)]+)\)/g;

/** Code-to-document bindings resolve and use governed kinds; every invariant is annotated somewhere. */
export const binding: Gate = {
    name: 'binding',
    run(ctx) {
        const out: Finding[] = [];
        const ontology = loadOntology(ctx);
        const annotatedInvariants = new Set<string>();
        for (const file of ctx.select(ctx.config.binding.sources)) {
            for (const match of ctx.read(file).matchAll(ANNOTATION)) {
                const [, kind = '', target = ''] = match;
                const spec = ontology.kinds[kind];
                if (!spec) {
                    out.push(finding('binding', file, `unknown annotation kind @fence:${kind}`));
                    continue;
                }
                if (!new RegExp(spec.target_pattern).test(target)) {
                    out.push(
                        finding(
                            'binding',
                            file,
                            `@fence:${kind}(${target}) does not match ${spec.target_pattern}`,
                        ),
                    );
                    continue;
                }
                if (spec.resolver === 'invariant') {
                    if (!ontology.invariants[target])
                        out.push(finding('binding', file, `unknown invariant ${target}`));
                    else annotatedInvariants.add(target);
                } else if (!resolveReference(ctx, target)) {
                    out.push(
                        finding('binding', file, `@fence:${kind}(${target}) does not resolve`),
                    );
                }
            }
        }
        for (const [name, spec] of Object.entries(ontology.invariants)) {
            if (!resolveReference(ctx, spec.defined_in))
                out.push(
                    finding(
                        'binding',
                        ctx.config.binding.ontology,
                        `invariant ${name} defined_in does not resolve: ${spec.defined_in}`,
                    ),
                );
            if (!annotatedInvariants.has(name))
                out.push(
                    finding(
                        'binding',
                        ctx.config.binding.ontology,
                        `invariant ${name} is not annotated in any source file`,
                        'warning',
                    ),
                );
        }
        return out;
    },
};

/** Governed prose uses the project's spelling. */
export const lexicon: Gate = {
    name: 'lexicon',
    run(ctx) {
        const out: Finding[] = [];
        const rules = loadLexicon(ctx).spelling.filter(
            (r) => r.avoid.toLowerCase() !== r.use.toLowerCase(),
        );
        for (const file of ctx.select(ctx.config.lexicon.include, ctx.config.lexicon.exclude)) {
            const text = ctx.read(file);
            for (const rule of rules) {
                const re = new RegExp(`\\b${rule.avoid}\\b`, 'gi');
                for (const match of text.matchAll(re)) {
                    const line = text.slice(0, match.index).split('\n').length;
                    out.push(
                        finding(
                            'lexicon',
                            file,
                            `line ${String(line)}: '${match[0]}' — use '${rule.use}'`,
                        ),
                    );
                }
            }
        }
        return out;
    },
};

/** CHANGELOG.md follows Keep a Changelog and covers the package version. */
export const changelog: Gate = {
    name: 'changelog',
    run(ctx) {
        const { file, categories } = ctx.config.changelog;
        if (!ctx.exists(file)) return [finding('changelog', file, 'missing')];
        const out: Finding[] = [];
        const lines = ctx.read(file).split('\n');
        const versions: string[] = [];
        for (const [index, line] of lines.entries()) {
            const where = `line ${String(index + 1)}`;
            if (line.startsWith('## ')) {
                const m =
                    /^## \[(Unreleased|\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)\](?: - (\d{4}-\d{2}-\d{2}))?\s*$/.exec(
                        line,
                    );
                if (!m) {
                    out.push(
                        finding(
                            'changelog',
                            file,
                            `${where}: heading must be '## [Unreleased]' or '## [x.y.z] - YYYY-MM-DD'`,
                        ),
                    );
                    continue;
                }
                if (m[1] !== 'Unreleased') {
                    if (!m[2])
                        out.push(
                            finding(
                                'changelog',
                                file,
                                `${where}: released version ${m[1] ?? ''} needs a date`,
                            ),
                        );
                    versions.push(m[1] ?? '');
                }
            } else if (line.startsWith('### ')) {
                const category = line.slice(4).trim();
                if (!categories.includes(category))
                    out.push(
                        finding('changelog', file, `${where}: unknown category '${category}'`),
                    );
            }
        }
        for (let i = 1; i < versions.length; i++) {
            if (compareSemver(versions[i - 1] ?? '', versions[i] ?? '') <= 0)
                out.push(
                    finding(
                        'changelog',
                        file,
                        `versions must descend: ${versions[i - 1] ?? ''} then ${versions[i] ?? ''}`,
                    ),
                );
        }
        const pkg = JSON.parse(ctx.read('package.json')) as { version: string };
        const base = pkg.version.split('-')[0] ?? pkg.version;
        if (
            !versions.includes(pkg.version) &&
            !versions.includes(base) &&
            !ctx.read(file).includes('## [Unreleased]')
        ) {
            out.push(
                finding(
                    'changelog',
                    file,
                    `no section for package version ${pkg.version} and no [Unreleased] section`,
                ),
            );
        }
        return out;
    },
};

function compareSemver(a: string, b: string): number {
    const pa = a.split('-')[0]?.split('.').map(Number) ?? [];
    const pb = b.split('-')[0]?.split('.').map(Number) ?? [];
    for (let i = 0; i < 3; i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d !== 0) return d;
    }
    const preA = a.includes('-');
    const preB = b.includes('-');
    if (preA === preB)
        return preA ? (a.split('-')[1] ?? '').localeCompare(b.split('-')[1] ?? '') : 0;
    return preA ? -1 : 1;
}

export const ALL_GATES: readonly Gate[] = [
    schemas,
    xref,
    workItems,
    checkpoint,
    reachability,
    generated,
    binding,
    lexicon,
    changelog,
];
