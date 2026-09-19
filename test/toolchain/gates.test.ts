/*
 * Each gate rule is shown to fire on a broken copy of a minimal fixture repository. The fixture
 * reuses the real schemas, ontology and lexicon files so the tests track the governed vocabulary.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { ALL_GATES } from '../../tools/gates/gates.js';
import { createContext, slugify } from '../../tools/gates/repo.js';
import type { GatesConfig } from '../../tools/gates/types.js';

const realRoot = join(import.meta.dirname, '../..');
const config = JSON.parse(readFileSync(join(realRoot, 'tools/gates.json'), 'utf8')) as GatesConfig;

const readFileSyncSafe = (path: string): string => readFileSync(path, 'utf8');

const roots: string[] = [];
afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
    const root = mkdtempSync(join(tmpdir(), 'fence-gates-'));
    roots.push(root);
    // The gate walker lists files through git, so a fixture is a repository.
    execFileSync('git', ['init', '-q'], { cwd: root });
    cpSync(join(realRoot, 'tools/schemas'), join(root, 'tools/schemas'), { recursive: true });
    cpSync(join(realRoot, 'tools/ontology.json'), join(root, 'tools/ontology.json'));
    cpSync(join(realRoot, 'tools/lexicon.json'), join(root, 'tools/lexicon.json'));
    cpSync(join(realRoot, 'tools/gates.json'), join(root, 'tools/gates.json'));
    for (const [id, slug] of [
        ['ADR-0001', 'immutable-registry-builder-with-inferred-types'],
        ['ADR-0003', 'serialization-format-2'],
    ] as const) {
        write(
            root,
            `docs/adr/${id}-${slug}.md`,
            `---\nid: ${id}\ntitle: ${slug}\nstatus: accepted\ndate: "2026-09-16"\ndeciders: [Tim Carlson]\n---\n\n# ${id}\n\n## Context\n\nx\n\n## Decision\n\nx\n\n## Consequences\n\nx\n`,
        );
    }
    mkdirSync(join(root, 'docs/work/items'), { recursive: true });
    mkdirSync(join(root, 'docs/toolchain'), { recursive: true });
    mkdirSync(join(root, 'src'), { recursive: true });
    write(root, 'package.json', JSON.stringify({ name: 'fixture', version: '2.0.0' }));
    write(root, 'CLAUDE.md', '# Fixture\n\nSee [docs/INDEX.md](docs/INDEX.md).\n');
    write(root, 'README.md', '# Fixture\n');
    write(root, 'MIGRATING.md', '# Migrating\n');
    write(root, 'CONTRIBUTING.md', '# Contributing\n');
    write(
        root,
        'CHANGELOG.md',
        '# Changelog\n\n## [Unreleased]\n\n## [2.0.0] - 2026-09-16\n\n### Added\n\n- Everything (FJ-0001).\n',
    );
    write(
        root,
        'docs/INDEX.md',
        `---\ntitle: Index\ndoc_type: index\nstatus: living\n---\n\n# Index\n\n- [work](work/README.md) · [checkpoint](work/CHECKPOINT.md) · [adrs](adr/README.md)\n- [ontology](toolchain/ontology.md) · [taxonomy](toolchain/taxonomy.md) · [lexicon](toolchain/lexicon.md)\n- [README](../README.md) · [MIGRATING](../MIGRATING.md) · [CHANGELOG](../CHANGELOG.md) · [CONTRIBUTING](../CONTRIBUTING.md)\n- ADR-0001 · ADR-0003\n`,
    );
    write(
        root,
        'docs/work/README.md',
        '---\ntitle: Work\ndoc_type: index\nstatus: living\n---\n\n# Work\n\n<!-- prettier-ignore-start -->\n<!-- BEGIN GENERATED: work-index -->\n<!-- END GENERATED: work-index -->\n<!-- prettier-ignore-end -->\n',
    );
    write(
        root,
        'docs/adr/README.md',
        '---\ntitle: ADRs\ndoc_type: index\nstatus: living\n---\n\n# ADRs\n\n<!-- prettier-ignore-start -->\n<!-- BEGIN GENERATED: adr-index -->\n<!-- END GENERATED: adr-index -->\n<!-- prettier-ignore-end -->\n',
    );
    for (const [file, blocks] of [
        ['docs/toolchain/ontology.md', ['ontology-kinds', 'ontology-invariants']],
        [
            'docs/toolchain/taxonomy.md',
            [
                'taxonomy-work-item',
                'taxonomy-adr',
                'taxonomy-doc',
                'taxonomy-changelog',
                'taxonomy-annotations',
            ],
        ],
        ['docs/toolchain/lexicon.md', ['lexicon-spelling', 'lexicon-terms']],
    ] as const) {
        write(
            root,
            file,
            `---\ntitle: ${file}\ndoc_type: governance\nstatus: living\n---\n\n# ${file}\n\n${blocks.map((b) => `<!-- prettier-ignore-start -->\n<!-- BEGIN GENERATED: ${b} -->\n<!-- END GENERATED: ${b} -->\n<!-- prettier-ignore-end -->`).join('\n\n')}\n`,
        );
    }
    write(
        root,
        'docs/work/items/FJ-0001-first.md',
        `---\nid: FJ-0001\ntitle: First\ntype: task\nstatus: done\npriority: p1\nmilestone: "2.0.0"\ncreated: 2026-09-16\nupdated: 2026-09-16\nparent: null\nblocks: []\nblocked_by: []\nacceptance_criteria:\n  - text: It works\n    satisfied: true\n    evidence: src/a.ts\n    verified_by: test\nlinks:\n  code: [src/a.ts]\n  docs: []\n  tests: []\n  adrs: [ADR-0001]\n---\n\n# FJ-0001 — First\n\n## Description\n\nDone.\n`,
    );
    write(
        root,
        'docs/work/items/FJ-0002-second.md',
        `---\nid: FJ-0002\ntitle: Second\ntype: task\nstatus: in-progress\npriority: p1\nmilestone: "2.0.0"\ncreated: 2026-09-16\nupdated: 2026-09-16\nparent: FJ-0001\nblocks: []\nblocked_by: []\nacceptance_criteria:\n  - text: Not yet\n    satisfied: false\n    evidence: null\n    verified_by: null\nlinks:\n  code: []\n  docs: []\n  tests: []\n  adrs: []\n---\n\n# FJ-0002 — Second\n\n## Description\n\nIn progress.\n`,
    );
    write(
        root,
        'docs/work/CHECKPOINT.md',
        `---\ndoc_type: checkpoint\nmilestone: "2.0.0"\nupdated: "2026-09-16"\nnext_action: "Finish FJ-0002 by writing the test."\nin_progress_items:\n  - FJ-0002\n---\n\n# Checkpoint\n\n## Now\n\nx\n\n## Done\n\nFJ-0001\n\n## In progress\n\nFJ-0002\n\n## Next action\n\nFinish FJ-0002.\n\n## Open questions\n\nnone\n`,
    );
    write(
        root,
        'src/a.ts',
        '// @fence:adr(ADR-0001#decision) @fence:invariant(builder.immutable)\n// @fence:invariant(registry.reserved-names) @fence:invariant(validator.plain-call) @fence:invariant(memo.per-fence)\n// @fence:invariant(result.vacuous-empty) @fence:invariant(serialize.json-only) @fence:invariant(hydrate.validate-everything)\nexport const a = 1;\n',
    );
    // render the generated blocks so the pristine fixture is clean
    const ctx = createContext(root, config, '2026-09-16');
    for (const gate of ALL_GATES) gate.fix?.(ctx);
    return root;
}

function write(root: string, rel: string, text: string): void {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text);
}

function run(root: string, gate?: string) {
    const ctx = createContext(root, config, '2026-09-16');
    return ALL_GATES.filter((g) => !gate || g.name === gate).flatMap((g) => g.run(ctx));
}

const errors = (findings: { severity: string; message: string }[]) =>
    findings.filter((f) => f.severity === 'error').map((f) => f.message);

describe('gate suite', () => {
    test('the pristine fixture passes every gate', () => {
        const root = fixture();
        expect(errors(run(root))).toEqual([]);
    });

    test('schemas: missing front matter and a missing required section', () => {
        const root = fixture();
        write(root, 'docs/toolchain/extra.md', '# No front matter\n');
        write(
            root,
            'docs/work/items/FJ-0003-third.md',
            '---\nid: FJ-0003\ntitle: Third\ntype: task\nstatus: backlog\npriority: p2\nmilestone: null\ncreated: 2026-09-16\nupdated: 2026-09-16\nacceptance_criteria:\n  - text: x\n    satisfied: false\nlinks: {}\n---\n\n# FJ-0003\n\nNo description section.\n',
        );
        const messages = errors(run(root, 'schemas'));
        expect(messages.some((m) => m.includes('missing front matter'))).toBe(true);
        expect(messages.some((m) => m.includes("missing required section '## Description'"))).toBe(
            true,
        );
    });

    test('xref: dangling links, anchors and ids', () => {
        const root = fixture();
        write(
            root,
            'docs/toolchain/links.md',
            '---\ntitle: Links\ndoc_type: guide\nstatus: living\n---\n\n# Links\n\n[gone](nowhere.md) [anchor](../INDEX.md#no-such-heading) FJ-0099 `FJ-0098 in code is ignored`\n',
        );
        const messages = errors(run(root, 'xref'));
        expect(messages).toContain('link does not resolve: nowhere.md');
        expect(messages).toContain('link does not resolve: ../INDEX.md#no-such-heading');
        expect(messages).toContain('id does not resolve: FJ-0099');
        expect(messages.some((m) => m.includes('FJ-0098'))).toBe(false);
    });

    test('work-items: done without evidence, asymmetric edges, in-progress not checkpointed', () => {
        const root = fixture();
        write(
            root,
            'docs/work/items/FJ-0001-first.md',
            readFileSyncSafe(join(root, 'docs/work/items/FJ-0001-first.md'))
                .replace('evidence: src/a.ts', 'evidence: null')
                .replace('blocks: []', 'blocks: [FJ-0002]'),
        );
        write(
            root,
            'docs/work/CHECKPOINT.md',
            readFileSyncSafe(join(root, 'docs/work/CHECKPOINT.md')).replace(/FJ-0002/g, 'FJ-0001'),
        );
        const messages = errors(run(root, 'work-items'));
        expect(messages).toContain('done but criterion 1 has no evidence');
        expect(messages).toContain('blocks FJ-0002 but FJ-0002 does not list blocked_by FJ-0001');
        expect(messages).toContain('in-progress but not mentioned in docs/work/CHECKPOINT.md');
    });

    test('checkpoint: closed item in next_action, unlisted in-progress item, future date', () => {
        const root = fixture();
        write(
            root,
            'docs/work/CHECKPOINT.md',
            readFileSyncSafe(join(root, 'docs/work/CHECKPOINT.md'))
                .replace('Finish FJ-0002 by writing the test.', 'Finish FJ-0001 again.')
                .replace('  - FJ-0002\n', '')
                .replace('updated: "2026-09-16"', 'updated: "2027-01-01"'),
        );
        const messages = errors(run(root, 'checkpoint'));
        expect(messages).toContain('next_action names FJ-0001, which is done');
        expect(messages).toContain('FJ-0002 is in-progress but not in in_progress_items');
        expect(messages).toContain('updated 2027-01-01 is in the future');
    });

    test('reachability: an orphan document is reported', () => {
        const root = fixture();
        write(
            root,
            'docs/toolchain/orphan.md',
            '---\ntitle: Orphan\ndoc_type: guide\nstatus: living\n---\n\n# Orphan\n',
        );
        expect(errors(run(root, 'reachability'))).toContain(
            'not reachable from CLAUDE.md or docs/INDEX.md',
        );
    });

    test('generated: a hand-edited block is stale and --fix repairs it', () => {
        const root = fixture();
        const file = join(root, 'docs/work/README.md');
        write(
            root,
            'docs/work/README.md',
            readFileSyncSafe(file).replace(
                '<!-- END GENERATED: work-index -->',
                'tampered\n<!-- END GENERATED: work-index -->',
            ),
        );
        expect(errors(run(root, 'generated'))).toContain(
            'generated blocks are stale; run npm run gates:fix',
        );
        const ctx = createContext(root, config, '2026-09-16');
        expect(ALL_GATES.find((g) => g.name === 'generated')?.fix?.(ctx)).toContain(
            'docs/work/README.md',
        );
        expect(errors(run(root, 'generated'))).toEqual([]);
    });

    test('generated: a block outside prettier-ignore comments is reported', () => {
        const root = fixture();
        const file = join(root, 'docs/adr/README.md');
        write(
            root,
            'docs/adr/README.md',
            readFileSyncSafe(file).replace('<!-- prettier-ignore-start -->\n', ''),
        );
        expect(errors(run(root, 'generated'))).toContain(
            "block 'adr-index' is not inside <!-- prettier-ignore-start --> … <!-- prettier-ignore-end -->",
        );
    });

    test('binding: unknown kind, bad target, unresolved target, unannotated invariant', () => {
        const root = fixture();
        write(
            root,
            'src/a.ts',
            '// @fence:wat(x) @fence:adr(not-an-adr) @fence:adr(ADR-0999) @fence:invariant(no.such)\nexport const a = 1;\n',
        );
        const findings = run(root, 'binding');
        const messages = errors(findings);
        expect(messages).toContain('unknown annotation kind @fence:wat');
        expect(messages.some((m) => m.includes('@fence:adr(not-an-adr) does not match'))).toBe(
            true,
        );
        expect(messages).toContain('@fence:adr(ADR-0999) does not resolve');
        expect(messages).toContain('unknown invariant no.such');
        expect(findings.filter((f) => f.severity === 'warning').length).toBeGreaterThan(0);
    });

    test('lexicon: a spelling variant is named with its replacement', () => {
        const root = fixture();
        write(
            root,
            'docs/toolchain/prose.md',
            '---\ntitle: Prose\ndoc_type: guide\nstatus: living\n---\n\n# Prose\n\nThis behaviour is an artefact.\n',
        );
        const messages = errors(run(root, 'lexicon'));
        expect(messages).toContain("line 9: 'behaviour' — use 'behavior'");
        expect(messages).toContain("line 9: 'artefact' — use 'artifact'");
    });

    test('changelog: bad heading, unknown category, non-descending versions, missing package version', () => {
        const root = fixture();
        write(
            root,
            'CHANGELOG.md',
            '# Changelog\n\n## 2.0.0\n\n### Broke\n\n## [1.0.0] - 2020-01-01\n\n## [1.5.0] - 2021-01-01\n',
        );
        const messages = errors(run(root, 'changelog'));
        expect(
            messages.some((m) =>
                m.includes("heading must be '## [Unreleased]' or '## [x.y.z] - YYYY-MM-DD'"),
            ),
        ).toBe(true);
        expect(messages.some((m) => m.includes("unknown category 'Broke'"))).toBe(true);
        expect(messages.some((m) => m.includes('versions must descend: 1.0.0 then 1.5.0'))).toBe(
            true,
        );
        expect(messages.some((m) => m.includes('no section for package version 2.0.0'))).toBe(true);
    });

    test('ignore-files: a nested .gitignore or an .eslintignore is refused', () => {
        const root = fixture();
        write(root, 'docs/.gitignore', 'local/\n');
        write(root, '.eslintignore', 'x\n');
        const messages = run(root, 'ignore-files').map((f) => f.file);
        expect(messages).toEqual(['.eslintignore', 'docs/.gitignore']);
    });

    test('the walker applies only the root .gitignore, not .git/info/exclude', () => {
        const root = fixture();
        write(root, '.git/info/exclude', 'docs/toolchain/excluded.md\n');
        write(root, 'docs/toolchain/excluded.md', '# No front matter\n');
        expect(errors(run(root, 'schemas'))).toContain(
            'missing front matter (schema tools/schemas/doc.schema.json)',
        );
    });

    test('checkpoint: a date one day ahead is tolerated, two days ahead is not', () => {
        const root = fixture();
        const file = join(root, 'docs/work/CHECKPOINT.md');
        write(
            root,
            'docs/work/CHECKPOINT.md',
            readFileSyncSafe(file).replace('updated: "2026-09-16"', 'updated: "2026-09-17"'),
        );
        expect(errors(run(root, 'checkpoint'))).toEqual([]);
        write(
            root,
            'docs/work/CHECKPOINT.md',
            readFileSyncSafe(file).replace('updated: "2026-09-17"', 'updated: "2026-09-18"'),
        );
        expect(errors(run(root, 'checkpoint'))).toContain('updated 2026-09-18 is in the future');
    });

    test('the walker sees what git would commit: ignored files are invisible to every gate', () => {
        const root = fixture();
        write(root, '.gitignore', 'scratch/\n');
        write(
            root,
            'scratch/orphan.md',
            '# No front matter, linked from nowhere, spelled behaviour\n',
        );
        expect(errors(run(root))).toEqual([]);
        write(root, 'docs/toolchain/visible.md', '# No front matter\n');
        expect(errors(run(root, 'schemas'))).toContain(
            'missing front matter (schema tools/schemas/doc.schema.json)',
        );
    });

    test('slugify follows the GitHub heading rules', () => {
        expect(slugify('Statuses and transitions')).toBe('statuses-and-transitions');
        expect(slugify('The `xref` gate (links)')).toBe('the-xref-gate-links');
        expect(slugify('Ontology — domain concepts')).toBe('ontology--domain-concepts');
    });
});
