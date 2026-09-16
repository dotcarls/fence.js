import { InvalidOutcomeError } from './errors.js';
import { isPlainObject } from './format.js';
import { Result } from './result.js';
import type { MemoizeOptions, Outcome, RegistryEntry, Step } from './types.js';

/** Runs one step's validator against a subject. */
export type Runner = (subject: unknown) => Outcome;

export function createStep(name: string, args: readonly unknown[]): Step {
    return Object.freeze({ name, args: Object.freeze([...args]) });
}

/**
 * Binds a registry entry to a recorded step. The validator is called as a plain function
 * (`this` is `undefined`) with the subject followed by the recorded arguments.
 */
export function bindStep(entry: RegistryEntry, step: Step): Runner {
    const { fn } = entry;
    const { args } = step;
    const run: Runner = (subject) => assertOutcome(fn(subject, ...args), step);
    const { memoize: memo } = entry.options;

    return memo ? memoize(run, memo === true ? {} : memo) : run;
}

/**
 * Caches outcomes per subject. Primitive keys use a `Map` (SameValueZero, so `1` and `'1'`
 * are distinct and `false` outcomes are cached); object keys use a `WeakMap` by identity.
 */
export function memoize(run: Runner, { key = identity }: MemoizeOptions): Runner {
    const primitives = new Map<unknown, Outcome>();
    const objects = new WeakMap<WeakKey, Outcome>();

    return (subject) => {
        const k = key(subject);

        if (isWeakKey(k)) {
            const hit = objects.get(k);
            if (hit !== undefined) {
                return hit;
            }
            const outcome = run(subject);
            objects.set(k, outcome);
            return outcome;
        }

        const hit = primitives.get(k);
        if (hit !== undefined) {
            return hit;
        }
        const outcome = run(subject);
        primitives.set(k, outcome);
        return outcome;
    };
}

/** Validates what a validator returned; anything but an {@link Outcome} is a programming error. */
export function assertOutcome(value: unknown, step: Step): Outcome {
    if (typeof value === 'boolean') {
        return value;
    }
    if (isResultList(value) || isResultRecord(value)) {
        return value;
    }
    throw new InvalidOutcomeError(step, value);
}

function isResultList(value: unknown): value is readonly Result[] {
    return Array.isArray(value) && value.every((item) => item instanceof Result);
}

function isResultRecord(value: unknown): value is Readonly<Record<string, Result>> {
    return isPlainObject(value) && Object.values(value).every((item) => item instanceof Result);
}

function identity(subject: unknown): unknown {
    return subject;
}

function isWeakKey(value: unknown): value is WeakKey {
    return (
        (typeof value === 'object' && value !== null) ||
        typeof value === 'function' ||
        (typeof value === 'symbol' && Symbol.keyFor(value) === undefined)
    );
}
