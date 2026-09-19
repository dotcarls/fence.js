import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Context, Lexicon, Ontology } from './types.js';

const BEGIN = (name: string) => `<!-- BEGIN GENERATED: ${name} -->`;
const END = (name: string) => `<!-- END GENERATED: ${name} -->`;

export function renderBlock(ctx: Context, name: string): string {
    switch (name) {
        case 'work-index':
            return workIndex(ctx);
        case 'adr-index':
            return adrIndex(ctx);
        case 'ontology-kinds':
            return ontologyKinds(ctx);
        case 'ontology-invariants':
            return ontologyInvariants(ctx);
        case 'taxonomy-work-item':
            return enumTable(ctx, 'tools/schemas/work-item.schema.json', [
                'type',
                'status',
                'priority',
            ]);
        case 'taxonomy-adr':
            return enumTable(ctx, 'tools/schemas/adr.schema.json', ['status']);
        case 'taxonomy-doc':
            return enumTable(ctx, 'tools/schemas/doc.schema.json', ['doc_type', 'status']);
        case 'taxonomy-changelog':
            return `| Category | Meaning |\n|---|---|\n${ctx.config.changelog.categories
                .map((c) => `| \`${c}\` | ${CHANGELOG_MEANING[c] ?? ''} |`)
                .join('\n')}`;
        case 'taxonomy-annotations':
            return ontologyKinds(ctx);
        case 'lexicon-spelling':
            return lexiconSpelling(ctx);
        case 'lexicon-terms':
            return lexiconTerms(ctx);
        default:
            throw new Error(`Unknown generated block '${name}'`);
    }
}

/** Replaces every configured block in `text`; returns the new text (unchanged when no markers). */
export function applyBlocks(ctx: Context, text: string, names: readonly string[]): string {
    let out = text;
    for (const name of names) {
        const begin = out.indexOf(BEGIN(name));
        const end = out.indexOf(END(name));
        if (begin < 0 || end < 0 || end < begin) {
            continue;
        }
        out = `${out.slice(0, begin + BEGIN(name).length)}\n${renderBlock(ctx, name)}\n${out.slice(end)}`;
    }
    return out;
}

export function hasMarkers(text: string, name: string): boolean {
    return text.includes(BEGIN(name)) && text.includes(END(name));
}

/**
 * A generated block must sit inside Prettier's range-ignore comments, or Prettier and the
 * generator rewrite the same bytes differently and the `generated` gate can never settle.
 */
export function isShieldedFromFormatter(text: string, name: string): boolean {
    const begin = text.indexOf(BEGIN(name));
    const end = text.indexOf(END(name));
    const start = text.lastIndexOf('<!-- prettier-ignore-start -->', begin);
    const stop = text.indexOf('<!-- prettier-ignore-end -->', end);
    return (
        start >= 0 && stop >= 0 && text.lastIndexOf('<!-- prettier-ignore-end -->', begin) < start
    );
}

const CHANGELOG_MEANING: Record<string, string> = {
    Added: 'new features',
    Changed: 'changes in existing functionality',
    Deprecated: 'soon-to-be removed features (unused in 2.0, which ships no compatibility surface)',
    Removed: 'features removed in this release',
    Fixed: 'bug fixes',
    Security: 'vulnerability fixes',
};

/** A front-matter scalar as a table cell; anything absent or non-scalar prints as a dash. */
function cell(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '—';
}

function workIndex(ctx: Context): string {
    const items = ctx
        .select(['docs/work/items/FJ-*.md'])
        .map((file) => ({ file, fm: ctx.frontMatter(file) ?? {} }))
        .sort((a, b) => String(a.fm.id).localeCompare(String(b.fm.id)));
    const order = ['in-progress', 'review', 'blocked', 'ready', 'backlog', 'done', 'cancelled'];
    const lines = [
        `_${String(items.length)} items. Generated from front matter; run \`npm run gates:fix\`._`,
    ];
    for (const status of order) {
        const rows = items.filter((i) => i.fm.status === status);
        if (rows.length === 0) continue;
        lines.push(
            '',
            `### ${status} (${String(rows.length)})`,
            '',
            '| id | title | type | priority | milestone | parent |',
            '|---|---|---|---|---|---|',
        );
        for (const { file, fm } of rows) {
            lines.push(
                `| [${String(fm.id)}](${file.replace('docs/work/', '')}) | ${String(fm.title)} | ${String(fm.type)} | ${String(fm.priority)} | ${cell(fm.milestone)} | ${cell(fm.parent)} |`,
            );
        }
    }
    return lines.join('\n');
}

function adrIndex(ctx: Context): string {
    const adrs = ctx
        .select(['docs/adr/ADR-*.md'])
        .map((file) => ({ file, fm: ctx.frontMatter(file) ?? {} }))
        .sort((a, b) => String(a.fm.id).localeCompare(String(b.fm.id)));
    const lines = [
        `_${String(adrs.length)} decision records. Generated from front matter; run \`npm run gates:fix\`._`,
        '',
        '| id | title | status | date | tags |',
        '|---|---|---|---|---|',
    ];
    for (const { file, fm } of adrs) {
        const tags = Array.isArray(fm.tags) ? fm.tags.map(String).join(', ') : '';
        lines.push(
            `| [${String(fm.id)}](${file.replace('docs/adr/', '')}) | ${String(fm.title)} | ${String(fm.status)} | ${String(fm.date)} | ${tags} |`,
        );
    }
    return lines.join('\n');
}

export function loadOntology(ctx: Context): Ontology {
    return JSON.parse(
        readFileSync(join(ctx.root, ctx.config.binding.ontology), 'utf8'),
    ) as Ontology;
}

export function loadLexicon(ctx: Context): Lexicon {
    return JSON.parse(readFileSync(join(ctx.root, ctx.config.lexicon.config), 'utf8')) as Lexicon;
}

/**
 * `text` as a fenced code block, which shows it byte for byte. A table cell cannot: GFM splits the
 * row on `|` before inline parsing and honors `\|` even inside a code span, while a code span takes
 * no other escape, so a pattern holding `\|` has no correct spelling there. A fence needs no escape,
 * only to be longer than any run of backticks inside it (CommonMark 4.5).
 */
export function codeBlock(text: string): string {
    const longest = Math.max(0, ...Array.from(text.matchAll(/`+/g), (run) => run[0].length));
    const fence = '`'.repeat(Math.max(3, longest + 1));
    return `${fence}text\n${text}\n${fence}`;
}

function ontologyKinds(ctx: Context): string {
    const kinds = Object.entries(loadOntology(ctx).kinds);
    const lines = ['| Kind | Meaning |', '|---|---|'];
    for (const [kind, spec] of kinds) {
        lines.push(`| \`@fence:${kind}\` | ${spec.summary} |`);
    }
    const width = Math.max(...kinds.map(([kind]) => kind.length));
    const patterns = kinds.map(([kind, spec]) => {
        if (/[\r\n]/.test(spec.target_pattern)) {
            throw new Error(`The target pattern of kind '${kind}' spans lines`);
        }
        return `${kind.padEnd(width)}  ${spec.target_pattern}`;
    });
    lines.push('', "A target must match its kind's pattern:", '', codeBlock(patterns.join('\n')));
    return lines.join('\n');
}

function ontologyInvariants(ctx: Context): string {
    const ontology = loadOntology(ctx);
    const lines = ['| Invariant | Meaning | Defined in |', '|---|---|---|'];
    for (const [name, spec] of Object.entries(ontology.invariants)) {
        const [path, anchor] = spec.defined_in.split('#');
        const label = (path ?? '').replace(/^docs\//, '');
        lines.push(
            `| \`${name}\` | ${spec.meaning} | [${label}${anchor ? `#${anchor}` : ''}](../../${spec.defined_in}) |`,
        );
    }
    return lines.join('\n');
}

function enumTable(ctx: Context, schemaPath: string, fields: readonly string[]): string {
    const schema = JSON.parse(readFileSync(join(ctx.root, schemaPath), 'utf8')) as {
        properties: Record<string, { enum?: unknown[]; description?: string }>;
    };
    const lines = [
        `_From [\`${schemaPath}\`](../../${schemaPath}). Generated; run \`npm run gates:fix\`._`,
        '',
    ];
    for (const field of fields) {
        const prop = schema.properties[field];
        const values = prop?.enum ?? [];
        lines.push(`- **\`${field}\`**: ${values.map((v) => `\`${String(v)}\``).join(' · ')}`);
    }
    return lines.join('\n');
}

function lexiconSpelling(ctx: Context): string {
    const lexicon = loadLexicon(ctx);
    const lines = [
        `_${lexicon.language}. Generated from [\`tools/lexicon.json\`](../../tools/lexicon.json); the \`lexicon\` gate enforces it._`,
        '',
        '| Avoid | Use | Note |',
        '|---|---|---|',
    ];
    for (const row of lexicon.spelling) {
        lines.push(`| ${row.avoid} | ${row.use} | ${row.note ?? ''} |`);
    }
    return lines.join('\n');
}

function lexiconTerms(ctx: Context): string {
    const lexicon = loadLexicon(ctx);
    const lines = ['| Avoid | Use | Why |', '|---|---|---|'];
    for (const row of lexicon.terms_to_avoid) {
        lines.push(`| ${row.avoid} | ${row.use} | ${row.why} |`);
    }
    return lines.join('\n');
}
