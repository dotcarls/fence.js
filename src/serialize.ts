import { HydrationError, SerializationError } from './errors.js';
import { formatValue, isFenceLike, isPlainObject } from './format.js';
import type { JsonValue, SerializedFence, SerializedStep, Step } from './types.js';

/** The serialization format version written by {@link FenceBuilder.toJSON} and {@link Fence.toJSON}. */
export const FORMAT_VERSION = 2;

/** Reserved object key that marks a nested fence inside serialized step arguments. */
export const NESTED_FENCE_KEY = '$fence';

/**
 * Converts recorded steps to the portable JSON form. Nested fences are tagged; any other
 * non-JSON value (functions, undefined, NaN, Dates, class instances, cycles) throws.
 *
 * @throws {@link SerializationError}
 */
export function serializeSteps(steps: readonly Step[]): SerializedFence {
    return {
        fence: FORMAT_VERSION,
        steps: steps.map((step, index): SerializedStep => ({
            name: step.name,
            args: step.args.map((arg, argIndex) =>
                toJsonValue(
                    arg,
                    `steps[${String(index)}].args[${String(argIndex)}]`,
                    new WeakSet(),
                    false,
                ),
            ),
        })),
    };
}

/** Lenient variant for diagnostics: values that are not JSON become their description. */
export function toLenientJsonValue(value: unknown, path: string): JsonValue {
    return toJsonValue(value, path, new WeakSet(), true);
}

/**
 * Accepts a JSON string or an already-parsed value and validates the version-2 shape,
 * including that every step argument is a JSON value (with nested fences tagged).
 *
 * @throws {@link HydrationError}
 */
export function parseSerializedFence(input: unknown, path = 'serialized fence'): SerializedFence {
    let value: unknown = input;

    if (typeof input === 'string') {
        try {
            value = JSON.parse(input);
        } catch (cause) {
            throw new HydrationError(`${path} is not valid JSON`, { cause });
        }
    }

    if (Array.isArray(value)) {
        throw new HydrationError(
            `${path} is a JSON array, which looks like v1 serialize() output; use FenceBuilder.fromLegacyJSON`,
        );
    }
    if (!isPlainObject(value)) {
        throw new HydrationError(`${path} must be an object, got ${formatValue(value)}`);
    }
    if (value.fence !== FORMAT_VERSION) {
        throw new HydrationError(
            `${path} has unsupported version ${formatValue(value.fence)}; ` +
                `expected ${String(FORMAT_VERSION)} (use fromLegacyJSON for v1 output)`,
        );
    }
    if (!Array.isArray(value.steps)) {
        throw new HydrationError(`${path}.steps must be an array`);
    }

    const steps = value.steps.map((step: unknown, index): SerializedStep => {
        const stepPath = `${path}.steps[${String(index)}]`;
        if (!isPlainObject(step)) {
            throw new HydrationError(`${stepPath} must be an object`);
        }
        if (typeof step.name !== 'string' || step.name === '') {
            throw new HydrationError(`${stepPath}.name must be a non-empty string`);
        }
        if (!Array.isArray(step.args)) {
            throw new HydrationError(`${stepPath}.args must be an array`);
        }
        return {
            name: step.name,
            args: Array.from(step.args as readonly unknown[], (arg, argIndex) =>
                assertJsonValue(arg, `${stepPath}.args[${String(argIndex)}]`),
            ),
        };
    });

    return { fence: FORMAT_VERSION, steps };
}

/**
 * Parses the v1 `serialize()` output: a JSON array of JSON strings, each an object with
 * `_name` and `_args`. Nested fences were never serializable in v1, so arguments are taken
 * as they are.
 *
 * @throws {@link HydrationError}
 */
export function parseLegacySerializedFence(input: string): SerializedFence {
    let outer: unknown;
    try {
        outer = JSON.parse(input);
    } catch (cause) {
        throw new HydrationError('Legacy serialized fence is not valid JSON', { cause });
    }
    if (!Array.isArray(outer)) {
        throw new HydrationError('Legacy serialized fence must be a JSON array of strings');
    }

    const steps = outer.map((raw: unknown, index): SerializedStep => {
        let inner: unknown = raw;
        if (typeof raw === 'string') {
            try {
                inner = JSON.parse(raw);
            } catch (cause) {
                throw new HydrationError(`Legacy step ${String(index)} is not valid JSON`, {
                    cause,
                });
            }
        }
        if (!isPlainObject(inner) || typeof inner._name !== 'string') {
            throw new HydrationError(`Legacy step ${String(index)} is missing "_name"`);
        }
        const args = Array.isArray(inner._args) ? (inner._args as readonly unknown[]) : [];
        return {
            name: inner._name,
            args: Array.from(args, (arg, argIndex) =>
                assertJsonValue(arg, `legacy step ${String(index)} args[${String(argIndex)}]`),
            ),
        };
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
    ancestors: WeakSet<object>,
    lenient: boolean,
): JsonValue {
    const reject = (reason: string): JsonValue => {
        if (lenient) {
            return formatValue(value);
        }
        throw new SerializationError(`${path} ${reason}`);
    };

    switch (typeof value) {
        case 'string':
        case 'boolean':
            return value;
        case 'number':
            return Number.isFinite(value)
                ? value
                : reject(`is ${String(value)}, which JSON cannot represent`);
        case 'object': {
            if (value === null) {
                return null;
            }
            if (ancestors.has(value)) {
                return lenient
                    ? '[Circular]'
                    : reject('is circular; only JSON values and fences can be serialized');
            }
            if (isFenceLike(value)) {
                return { [NESTED_FENCE_KEY]: value.toJSON() };
            }
            if (Array.isArray(value)) {
                ancestors.add(value);
                // Array.from visits holes as undefined, so sparse arrays hit the error path.
                const items = Array.from(value as readonly unknown[], (item, index) =>
                    toJsonValue(item, `${path}[${String(index)}]`, ancestors, lenient),
                );
                ancestors.delete(value);
                return items;
            }
            if (isPlainObject(value)) {
                if (NESTED_FENCE_KEY in value) {
                    return reject(`uses the reserved key "${NESTED_FENCE_KEY}"`);
                }
                ancestors.add(value);
                const entries = Object.entries(value).map(([key, item]): [string, JsonValue] => [
                    key,
                    toJsonValue(item, `${path}.${key}`, ancestors, lenient),
                ]);
                ancestors.delete(value);
                return Object.fromEntries(entries);
            }
            return reject(
                `is ${formatValue(value)}; only JSON values and fences can be serialized`,
            );
        }
        default:
            return reject(
                `is ${formatValue(value)}; only JSON values and fences can be serialized`,
            );
    }
}

function assertJsonValue(value: unknown, path: string): JsonValue {
    switch (typeof value) {
        case 'string':
        case 'boolean':
            return value;
        case 'number':
            if (!Number.isFinite(value)) {
                throw new HydrationError(`${path} is ${String(value)}, not a JSON value`);
            }
            return value;
        case 'object': {
            if (value === null) {
                return null;
            }
            if (Array.isArray(value)) {
                return Array.from(value as readonly unknown[], (item, index) =>
                    assertJsonValue(item, `${path}[${String(index)}]`),
                );
            }
            if (isPlainObject(value)) {
                if (NESTED_FENCE_KEY in value) {
                    if (Object.keys(value).length !== 1) {
                        throw new HydrationError(
                            `${path} mixes "${NESTED_FENCE_KEY}" with other keys`,
                        );
                    }
                    const nested = parseSerializedFence(
                        value[NESTED_FENCE_KEY],
                        `${path}.${NESTED_FENCE_KEY}`,
                    );
                    if (nested.steps.length === 0) {
                        throw new HydrationError(
                            `${path}.${NESTED_FENCE_KEY} is a nested fence with no steps`,
                        );
                    }
                    return { [NESTED_FENCE_KEY]: nested };
                }
                return Object.fromEntries(
                    Object.entries(value).map(([key, item]): [string, JsonValue] => [
                        key,
                        assertJsonValue(item, `${path}.${key}`),
                    ]),
                );
            }
            throw new HydrationError(`${path} is ${formatValue(value)}, not a JSON value`);
        }
        default:
            throw new HydrationError(`${path} is ${formatValue(value)}, not a JSON value`);
    }
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
