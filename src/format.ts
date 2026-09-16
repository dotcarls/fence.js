/** Compact, single-line description of a value for messages and explanations. */
export function formatValue(value: unknown, maxLength = 60): string {
    const text = describe(value);
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/** Formats step arguments as they would appear in a call: `min(8)`, `policy({...})`. */
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

function describe(value: unknown): string {
    switch (typeof value) {
        case 'string':
            return JSON.stringify(value);
        case 'number':
        case 'boolean':
        case 'bigint':
        case 'symbol':
            return String(value);
        case 'undefined':
            return 'undefined';
        case 'function':
            return `[Function ${value.name || 'anonymous'}]`;
        case 'object':
            if (value === null) {
                return 'null';
            }
            if (Array.isArray(value)) {
                return `[${value.map((item: unknown) => describe(item)).join(', ')}]`;
            }
            if (isPlainObject(value)) {
                const body = Object.entries(value)
                    .map(([key, item]) => `${key}: ${describe(item)}`)
                    .join(', ');
                return `{${body}}`;
            }
            if (isFenceLike(value)) {
                return `Fence(${String(value.steps.length)} steps)`;
            }
            return `[object ${tagOf(value)}]`;
    }
}

/** Duck-typed to keep this module free of a dependency on `Fence`. */
function isFenceLike(value: object): value is { steps: readonly unknown[] } {
    return (
        (value as { [Symbol.toStringTag]?: unknown })[Symbol.toStringTag] === 'Fence' &&
        Array.isArray((value as { steps?: unknown }).steps)
    );
}

function tagOf(value: object): string {
    const tag = Object.prototype.toString.call(value).slice(8, -1);
    return tag === 'Object' ? value.constructor.name || 'Object' : tag;
}
