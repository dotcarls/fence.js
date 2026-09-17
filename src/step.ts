import { InvalidOutcomeError } from './errors.js';
import { isPlainObject } from './format.js';
import { Result } from './result.js';
import type {
    MemoizeOptions,
    Outcome,
    Registry,
    RegistryEntries,
    RegistryEntry,
    Step,
    Validator,
} from './types.js';

/** Runs one step's validator against a subject. */
export type Runner = (subject: unknown) => Outcome;

/** A frozen step record. Arguments are held by reference. */
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
 * Caches outcomes per subject. Primitive keys (symbols included) use a `Map`, so `1` and
 * `'1'` are distinct and `false` outcomes are cached; object and function keys use a
 * `WeakMap` by identity.
 */
export function memoize(run: Runner, { key = identity }: MemoizeOptions): Runner {
    const primitives = new Map<unknown, Outcome>();
    const objects = new WeakMap<object, Outcome>();

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
    if (typeof value === 'boolean' || isResultList(value) || isResultRecord(value)) {
        return value;
    }
    throw new InvalidOutcomeError(step, value);
}

/** The frozen name-to-validator view of a registry, cached per entries map. */
export function registryOf(entries: RegistryEntries): Registry {
    let registry = registries.get(entries);
    if (!registry) {
        registry = Object.freeze(
            Object.fromEntries<Validator>(
                [...entries].map(([name, { fn }]): [string, Validator] => [name, fn]),
            ),
        );
        registries.set(entries, registry);
    }
    return registry;
}

const registries = new WeakMap<RegistryEntries, Registry>();

function isResultList(value: unknown): value is readonly Result[] {
    if (!Array.isArray(value)) {
        return false;
    }
    // for...of visits holes (as undefined), unlike every(), so sparse arrays are rejected.
    for (const item of value as readonly unknown[]) {
        if (!(item instanceof Result)) {
            return false;
        }
    }
    return true;
}

function isResultRecord(value: unknown): value is Readonly<Record<string, Result>> {
    return isPlainObject(value) && Object.values(value).every((item) => item instanceof Result);
}

function identity(subject: unknown): unknown {
    return subject;
}

function isWeakKey(value: unknown): value is object {
    return (typeof value === 'object' && value !== null) || typeof value === 'function';
}
