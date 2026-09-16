import { HydrationError, SerializationError } from './errors.js';
import { formatValue, isPlainObject } from './format.js';
import type { JsonValue, SerializedFence, SerializedStep, Step } from './types.js';

export const FORMAT_VERSION = 2;

/** Reserved object key that marks a nested fence inside serialized step arguments. */
export const NESTED_FENCE_KEY = '$fence';

/**
 * Converts recorded steps to the portable JSON form. `tagNested` recognises nested fences
 * (kept out of this module to avoid a dependency cycle); every other non-JSON value throws.
 */
export function serializeSteps(
    steps: readonly Step[],
    tagNested: (value: object) => SerializedFence | undefined,
): SerializedFence {
    return {
        fence: FORMAT_VERSION,
        steps: steps.map((step, index) => ({
            name: step.name,
            args: step.args.map((arg, argIndex) =>
                toJsonValue(arg, `steps[${String(index)}].args[${String(argIndex)}]`, tagNested),
            ),
        })),
    };
}

/** Accepts a JSON string or an already-parsed value and validates the version-2 shape. */
export function parseSerializedFence(input: unknown): SerializedFence {
    let value: unknown = input;

    if (typeof input === 'string') {
        try {
            value = JSON.parse(input);
        } catch (cause) {
            throw new HydrationError('Serialized fence is not valid JSON', [], { cause });
        }
    }

    if (!isPlainObject(value)) {
        throw new HydrationError(`Serialized fence must be an object, got ${formatValue(value)}`);
    }
    if (value.fence !== FORMAT_VERSION) {
        throw new HydrationError(
            `Unsupported serialized fence version ${formatValue(value.fence)}; ` +
                `expected ${String(FORMAT_VERSION)} (use fromLegacyJSON for v1 output)`,
        );
    }
    if (!Array.isArray(value.steps)) {
        throw new HydrationError('Serialized fence "steps" must be an array');
    }

    const steps = value.steps.map((step: unknown, index): SerializedStep => {
        if (!isPlainObject(step)) {
            throw new HydrationError(`steps[${String(index)}] must be an object`);
        }
        if (typeof step.name !== 'string' || step.name === '') {
            throw new HydrationError(`steps[${String(index)}].name must be a non-empty string`);
        }
        if (!Array.isArray(step.args)) {
            throw new HydrationError(`steps[${String(index)}].args must be an array`);
        }
        return { name: step.name, args: step.args as JsonValue[] };
    });

    return { fence: FORMAT_VERSION, steps };
}

/**
 * Parses the v1 `serialize()` output: a JSON array of JSON strings, each an object with
 * `_name` and `_args`. Nested fences were never serializable in v1, so arguments are taken
 * as they are.
 */
export function parseLegacySerializedFence(input: string): SerializedFence {
    let outer: unknown;
    try {
        outer = JSON.parse(input);
    } catch (cause) {
        throw new HydrationError('Legacy serialized fence is not valid JSON', [], { cause });
    }
    if (!Array.isArray(outer)) {
        throw new HydrationError('Legacy serialized fence must be a JSON array of strings');
    }

    const steps = outer.map((raw: unknown, index): SerializedStep => {
        const inner: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!isPlainObject(inner) || typeof inner._name !== 'string') {
            throw new HydrationError(`Legacy step ${String(index)} is missing "_name"`);
        }
        const args = Array.isArray(inner._args) ? (inner._args as JsonValue[]) : [];
        return { name: inner._name, args };
    });

    return { fence: FORMAT_VERSION, steps };
}

/** Every validator name used by `serialized`, including inside nested fences, in traversal order. */
export function collectStepNames(
    serialized: SerializedFence,
    into = new Set<string>(),
): Set<string> {
    for (const step of serialized.steps) {
        into.add(step.name);
        for (const arg of step.args) {
            collectNestedNames(arg, into);
        }
    }
    return into;
}

function collectNestedNames(value: JsonValue, into: Set<string>): void {
    if (isJsonArray(value)) {
        for (const item of value) {
            collectNestedNames(item, into);
        }
    } else if (isJsonObject(value)) {
        if (NESTED_FENCE_KEY in value) {
            collectStepNames(parseSerializedFence(value[NESTED_FENCE_KEY]), into);
        } else {
            for (const item of Object.values(value)) {
                collectNestedNames(item, into);
            }
        }
    }
}

/** Restores step arguments, replacing `{ "$fence": ... }` tags with `buildNested(...)`. */
export function reviveArgs(
    args: readonly JsonValue[],
    buildNested: (nested: SerializedFence) => unknown,
): unknown[] {
    return args.map((arg) => revive(arg, buildNested));
}

function toJsonValue(
    value: unknown,
    path: string,
    tagNested: (value: object) => SerializedFence | undefined,
): JsonValue {
    switch (typeof value) {
        case 'string':
        case 'boolean':
            return value;
        case 'number':
            if (!Number.isFinite(value)) {
                throw new SerializationError(
                    `${path} is ${String(value)}, which JSON cannot represent`,
                );
            }
            return value;
        case 'object': {
            if (value === null) {
                return null;
            }
            if (Array.isArray(value)) {
                return value.map((item: unknown, index) =>
                    toJsonValue(item, `${path}[${String(index)}]`, tagNested),
                );
            }
            const nested = tagNested(value);
            if (nested) {
                return { [NESTED_FENCE_KEY]: nested as unknown as JsonValue };
            }
            if (isPlainObject(value)) {
                if (NESTED_FENCE_KEY in value) {
                    throw new SerializationError(
                        `${path} uses the reserved key "${NESTED_FENCE_KEY}"`,
                    );
                }
                return Object.fromEntries(
                    Object.entries(value).map(([key, item]) => [
                        key,
                        toJsonValue(item, `${path}.${key}`, tagNested),
                    ]),
                );
            }
            throw new SerializationError(
                `${path} is ${formatValue(value)}; only JSON values and fences can be serialized`,
            );
        }
        default:
            throw new SerializationError(
                `${path} is ${formatValue(value)}; only JSON values and fences can be serialized`,
            );
    }
}

function revive(value: JsonValue, buildNested: (nested: SerializedFence) => unknown): unknown {
    if (isJsonArray(value)) {
        return value.map((item) => revive(item, buildNested));
    }
    if (isJsonObject(value)) {
        if (NESTED_FENCE_KEY in value) {
            return buildNested(parseSerializedFence(value[NESTED_FENCE_KEY]));
        }
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, revive(item, buildNested)]),
        );
    }
    return value;
}

function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
    return Array.isArray(value);
}

function isJsonObject(value: JsonValue): value is Readonly<Record<string, JsonValue>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
