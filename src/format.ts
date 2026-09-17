import type { SerializedFence } from './types.js';

const MAX_DEPTH = 4;
const MAX_ITEMS = 8;

/** Compact, single-line description of a value for messages and explanations. */
export function formatValue(value: unknown, maxLength = 60): string {
    const text = describe(value, 0, new WeakSet());
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/**
 * Formats a step as a call: `min(8)`, `policy({username: Fence(4 steps)})`. A step without
 * arguments prints as its bare name (`required`).
 */
export function formatCall(name: string, args: readonly unknown[]): string {
    return args.length === 0 ? name : `${name}(${args.map((arg) => formatValue(arg)).join(', ')})`;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const proto: unknown = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/** What serialization and formatting need from a fence, duck-typed to avoid importing `Fence`. */
export interface FenceLike {
    readonly steps: readonly unknown[];
    toJSON(): SerializedFence;
}

export function isFenceLike(value: unknown): value is FenceLike {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as {
        [Symbol.toStringTag]?: unknown;
        steps?: unknown;
        toJSON?: unknown;
    };
    return (
        candidate[Symbol.toStringTag] === 'Fence' &&
        Array.isArray(candidate.steps) &&
        typeof candidate.toJSON === 'function'
    );
}

function describe(value: unknown, depth: number, ancestors: WeakSet<object>): string {
    switch (typeof value) {
        case 'string':
            return JSON.stringify(value);
        case 'number':
        case 'boolean':
        case 'symbol':
            return String(value);
        case 'bigint':
            return `${String(value)}n`;
        case 'undefined':
            return 'undefined';
        case 'function':
            return `[Function ${value.name || 'anonymous'}]`;
        case 'object':
            if (value === null) {
                return 'null';
            }
            if (ancestors.has(value)) {
                return '[Circular]';
            }
            if (isFenceLike(value)) {
                return `Fence(${String(value.steps.length)} steps)`;
            }
            if (Array.isArray(value)) {
                return depth >= MAX_DEPTH ? '[…]' : describeItems(value, depth, ancestors);
            }
            if (isPlainObject(value)) {
                return depth >= MAX_DEPTH ? '{…}' : describeEntries(value, depth, ancestors);
            }
            return `[object ${tagOf(value)}]`;
    }
}

function describeItems(
    value: readonly unknown[],
    depth: number,
    ancestors: WeakSet<object>,
): string {
    ancestors.add(value);
    const items = Array.from(value.slice(0, MAX_ITEMS), (item: unknown) =>
        describe(item, depth + 1, ancestors),
    );
    ancestors.delete(value);
    if (value.length > MAX_ITEMS) {
        items.push('…');
    }
    return `[${items.join(', ')}]`;
}

function describeEntries(
    value: Record<string, unknown>,
    depth: number,
    ancestors: WeakSet<object>,
): string {
    ancestors.add(value);
    const entries = Object.entries(value);
    const items = entries
        .slice(0, MAX_ITEMS)
        .map(([key, item]) => `${key}: ${describe(item, depth + 1, ancestors)}`);
    ancestors.delete(value);
    if (entries.length > MAX_ITEMS) {
        items.push('…');
    }
    return `{${items.join(', ')}}`;
}

function tagOf(value: object): string {
    const tag = Object.prototype.toString.call(value).slice(8, -1);
    if (tag !== 'Object') {
        return tag;
    }
    const ctor: unknown = (value as { constructor?: unknown }).constructor;
    return typeof ctor === 'function' && ctor.name ? ctor.name : 'Object';
}
