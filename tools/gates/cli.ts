/*
 * The project's gate tool: `npm run gates` (check), `npm run gates:fix` (repair generated blocks),
 * plus scaffolds for work items and decision records. See docs/toolchain/gates.md.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_GATES } from './gates.js';
import { createContext } from './repo.js';
import type { Context, Finding, GatesConfig } from './types.js';

const root = fileURLToPath(new URL('../..', import.meta.url)).replace(/\/$/, '');
const [command = 'gates', ...rest] = process.argv.slice(2);

function loadContext(): Context {
    const config = JSON.parse(readFileSync(join(root, 'tools/gates.json'), 'utf8')) as GatesConfig;
    return createContext(root, config, new Date().toISOString().slice(0, 10));
}

function flag(name: string): boolean {
    return rest.includes(`--${name}`);
}

function option(name: string): string | undefined {
    const index = rest.indexOf(`--${name}`);
    return index >= 0 ? rest[index + 1] : undefined;
}

function options(name: string): string[] {
    const values: string[] = [];
    rest.forEach((arg, index) => {
        if (arg === `--${name}` && rest[index + 1] !== undefined)
            values.push(rest[index + 1] ?? '');
    });
    return values;
}

function report(findings: readonly Finding[], json: boolean, quietWhenClean: boolean): number {
    const errors = findings.filter((f) => f.severity === 'error');
    const warnings = findings.filter((f) => f.severity === 'warning');
    if (json) {
        console.log(
            JSON.stringify(
                {
                    ok: errors.length === 0,
                    errors: errors.length,
                    warnings: warnings.length,
                    findings,
                },
                null,
                2,
            ),
        );
    } else {
        for (const f of findings)
            console.log(
                `${f.severity === 'error' ? 'ERROR' : 'warn '} [${f.gate}] ${f.file}: ${f.message}`,
            );
        if (!quietWhenClean || findings.length > 0) {
            console.log(
                `gates: ${errors.length === 0 ? 'PASS' : 'FAIL'} (${String(errors.length)} errors, ${String(warnings.length)} warnings, ${String(ALL_GATES.length)} gates)`,
            );
        }
    }
    return errors.length === 0 ? 0 : 1;
}

function runGates(): number {
    let ctx = loadContext();
    if (flag('fix')) {
        const rewritten = ALL_GATES.flatMap((g) => g.fix?.(ctx) ?? []);
        for (const file of rewritten) console.log(`fixed  ${file}`);
        ctx = loadContext();
    }
    const only = option('only');
    const gates = only ? ALL_GATES.filter((g) => g.name === only) : ALL_GATES;
    return report(
        gates.flatMap((g) => g.run(ctx)),
        flag('json'),
        flag('hook'),
    );
}

function nextId(ctx: Context, prefix: string, dir: string): string {
    const highest = ctx.files
        .filter((f) => f.startsWith(`${dir}/${prefix}-`))
        .map((f) =>
            Number.parseInt(
                f.slice(dir.length + prefix.length + 2, dir.length + prefix.length + 6),
                10,
            ),
        )
        .filter((n) => !Number.isNaN(n))
        .reduce((a, b) => Math.max(a, b), -1);
    return `${prefix}-${String(highest + 1).padStart(4, '0')}`;
}

function slug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)
        .replace(/-$/, '');
}

function newItem(): number {
    const title = option('title');
    if (!title || title.length < 3) {
        console.error(
            'usage: npm run work -- new --title "..." [--type task] [--priority p2] [--milestone 2.1.0] [--parent FJ-NNNN] [--status backlog]',
        );
        return 2;
    }
    const ctx = loadContext();
    const id = nextId(ctx, 'FJ', 'docs/work/items');
    const file = `docs/work/items/${id}-${slug(title)}.md`;
    const parent = option('parent');
    if (parent && !ctx.resolveId(parent)) {
        console.error(`parent ${parent} does not exist`);
        return 2;
    }
    const status = option('status') ?? 'backlog';
    if (['done', 'in-progress', 'cancelled'].includes(status)) {
        console.error(`a new item cannot start as ${status}`);
        return 2;
    }
    const criteria = options('criterion');
    const milestone = option('milestone');
    const body = `---
id: ${id}
title: ${JSON.stringify(title)}
type: ${option('type') ?? 'task'}
status: ${status}
priority: ${option('priority') ?? 'p2'}
milestone: ${milestone ? JSON.stringify(milestone) : 'null'}
created: ${ctx.today()}
updated: ${ctx.today()}
parent: ${parent ?? 'null'}
blocks: []
blocked_by: []
acceptance_criteria:
${(criteria.length > 0 ? criteria : ['State the observable outcome that proves this is done']).map((c) => `  - text: ${JSON.stringify(c)}\n    satisfied: false\n    evidence: null\n    verified_by: null`).join('\n')}
links:
  code: []
  docs: []
  tests: []
  adrs: []
---

# ${id} — ${title}

## Description

${option('description') ?? 'What and why, in a paragraph. Link the decisions and documents that constrain it.'}

## Notes

- ${ctx.today()}: created
`;
    writeFileSync(join(root, file), body, { flag: 'wx' });
    console.log(file);
    return regenerate();
}

function newAdr(): number {
    const title = option('title');
    if (!title || title.length < 3) {
        console.error('usage: npm run adr -- new --title "..."');
        return 2;
    }
    const ctx = loadContext();
    const id = nextId(ctx, 'ADR', 'docs/adr');
    const file = `docs/adr/${id}-${slug(title)}.md`;
    const template = readFileSync(join(root, 'docs/adr/TEMPLATE.md'), 'utf8')
        .replace(/\{id\}/g, id)
        .replace(/\{title\}/g, title);
    const body = `---
id: ${id}
title: ${JSON.stringify(title)}
status: proposed
date: ${ctx.today()}
deciders:
  - Tim Carlson
tags: []
supersedes: null
superseded_by: null
related: []
---
${template}`;
    writeFileSync(join(root, file), body, { flag: 'wx' });
    console.log(file);
    return regenerate();
}

function regenerate(): number {
    const ctx = loadContext();
    for (const gate of ALL_GATES) {
        for (const file of gate.fix?.(ctx) ?? []) console.log(`fixed  ${file}`);
    }
    return 0;
}

function checkpointCheck(): number {
    const ctx = loadContext();
    const gates = ALL_GATES.filter((g) => g.name === 'checkpoint' || g.name === 'schemas');
    const findings = gates
        .flatMap((g) => g.run(ctx))
        .filter((f) => f.gate === 'checkpoint' || f.file === 'docs/work/CHECKPOINT.md');
    return report(findings, flag('json'), false);
}

function main(): number {
    switch (command) {
        case 'gates':
            return runGates();
        case 'index':
            return regenerate();
        case 'item':
        case 'work':
            return rest[0] === 'new' ? newItem() : usage();
        case 'adr':
            return rest[0] === 'new' ? newAdr() : usage();
        case 'checkpoint':
            return checkpointCheck();
        default:
            return usage();
    }
}

function usage(): number {
    console.error(`usage:
  tsx tools/gates/cli.ts gates [--fix] [--json] [--only <gate>] [--hook]
  tsx tools/gates/cli.ts index
  tsx tools/gates/cli.ts item new --title "..." [--type ...] [--priority ...] [--milestone ...] [--parent FJ-NNNN] [--criterion "..."]...
  tsx tools/gates/cli.ts adr new --title "..."
  tsx tools/gates/cli.ts checkpoint check`);
    return 2;
}

if (!existsSync(join(root, 'tools/gates.json'))) {
    console.error('tools/gates.json not found');
    process.exit(2);
}
process.exit(main());
