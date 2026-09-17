import { HydrationError, RegistrationError } from './errors.js';
import { Fence } from './fence.js';
import {
    collectStepNames,
    parseLegacySerializedFence,
    parseSerializedFence,
    reviveArgs,
    serializeSteps,
} from './serialize.js';
import { createStep, registryOf } from './step.js';
import type {
    EmptyRegistry,
    Extend,
    Fluent,
    Merge,
    Registrable,
    Registry,
    RegistryEntries,
    RegistryEntry,
    SerializedFence,
    Step,
    StepName,
    StepOptions,
    Validator,
    ValidatorArgs,
} from './types.js';

/**
 * Composes fences from a registry of named validators.
 *
 * A builder is an immutable value: {@link FenceBuilder.register}, {@link FenceBuilder.step}
 * and every fluent step method return a new builder and leave the receiver untouched, so a
 * base builder can be derived from any number of times.
 *
 * ```ts
 * const base = FenceBuilder.create()
 *     .register('required', (v: unknown) => v != null)
 *     .register('min', (v: string, n: number) => v.length >= n);
 *
 * const username = base.required().min(4).build(); // typed: min(n: number)
 * const password = base.required().min(8).build(); // base is unchanged
 * ```
 *
 * @typeParam R The registry: validator names to validator types. Grows with each `register`.
 */
export class FenceBuilder<R extends Registry = EmptyRegistry> {
    static {
        Object.defineProperty(FenceBuilder.prototype, Symbol.toStringTag, {
            value: 'FenceBuilder',
            configurable: true,
        });
    }

    static readonly #descriptors = new WeakMap<RegistryEntries, PropertyDescriptorMap>();

    #entries: RegistryEntries = new Map();
    #steps: readonly Step[] = EMPTY_STEPS;

    /**
     * Creates a builder with an empty registry. `new FenceBuilder()` does the same; the type
     * argument, if given explicitly, must be {@link EmptyRegistry}.
     */
    static create(): Fluent<EmptyRegistry> {
        return new FenceBuilder();
    }

    /**
     * Restores a builder from {@link FenceBuilder.toJSON} output (an object or a JSON string).
     * Step names are resolved against `base`, which is either a builder (whose registry and
     * options are used) or a plain registry. Nested fences are restored with the same
     * registry. Steps recorded on `base` itself are not carried over.
     *
     * @throws {@link HydrationError} when the input is malformed or names unregistered
     * validators. Its `missing` property lists every unknown name, nested fences included.
     */
    static fromJSON<T extends Registry>(json: unknown, base: FenceBuilder<T> | T): Fluent<T> {
        return FenceBuilder.#hydrate<T>(entriesOf(base), parseSerializedFence(json));
    }

    /**
     * Restores a builder from the string produced by v1's `serialize()`.
     *
     * @throws {@link HydrationError}
     */
    static fromLegacyJSON<T extends Registry>(json: string, base: FenceBuilder<T> | T): Fluent<T> {
        return FenceBuilder.#hydrate<T>(entriesOf(base), parseLegacySerializedFence(json));
    }

    /** The registered validators by name. */
    get registry(): R {
        return registryOf(this.#entries) as R;
    }

    /** The registered validators with their options; accepted by {@link FenceBuilder.registerAll}. */
    get entries(): RegistryEntries {
        return this.#entries;
    }

    /** The recorded steps, in execution order. */
    get steps(): readonly Step[] {
        return this.#steps;
    }

    /**
     * Returns a builder whose registry also holds `fn` as `name`, exposing a fluent method
     * `name(...args)` typed from `fn`'s parameters after the subject.
     *
     * A name that is not a string literal (a `string` variable) is allowed at run time and
     * widens the builder's type: every fluent method then accepts any arguments, and the
     * builder stays wide.
     *
     * @throws {@link RegistrationError} for a duplicate or reserved name, or a non-function.
     */
    register<N extends string, F extends Validator>(
        name: StepName<R, N>,
        fn: F,
        options: StepOptions = {},
    ): Fluent<Extend<R, N, F>> {
        return FenceBuilder.#make(this.#extend([[name, { fn, options }]]), this.#steps);
    }

    /**
     * Registers every validator in `validators` under its key, or copies another builder's
     * registry including its options. `options` apply to validators given as a record.
     *
     * @throws {@link RegistrationError} for duplicate or reserved names, or non-functions.
     */
    registerAll<V extends Registry>(
        validators: Registrable<R, V> | FenceBuilder<V>,
        options: StepOptions = {},
    ): Fluent<Merge<R, V>> {
        const additions: [string, RegistryEntry][] =
            validators instanceof FenceBuilder
                ? [...validators.#entries]
                : Object.entries<Validator>(validators as Registry).map(([name, fn]) => [
                      name,
                      { fn, options },
                  ]);
        return FenceBuilder.#make(this.#extend(additions), this.#steps);
    }

    /**
     * Records a step by name. The fluent methods are sugar for this:
     * `builder.min(4)` is `builder.step('min', 4)`. Arguments are held by reference.
     *
     * @throws {@link RegistrationError} when `name` is not a registered validator.
     */
    step<K extends keyof R & string>(name: K, ...args: ValidatorArgs<R[K]>): Fluent<R> {
        assertStepName(name);
        if (!this.#entries.has(name)) {
            throw new RegistrationError(`No validator is registered as '${name}'`);
        }
        return FenceBuilder.#make(
            this.#entries,
            Object.freeze([...this.#steps, createStep(name, args)]),
        );
    }

    /**
     * Builds an immutable {@link Fence} from the recorded steps.
     *
     * @throws {@link EmptyFenceError} when no steps have been recorded.
     */
    build(): Fence<R> {
        return new Fence<R>(this.#entries, this.#steps);
    }

    /** @throws {@link SerializationError} when a step argument is not a JSON value or a fence. */
    toJSON(): SerializedFence {
        return serializeSteps(this.#steps);
    }

    /**
     * @deprecated Builders are immutable; every operation already returns a new builder.
     * Returns `this`.
     */
    fork(): this {
        return this;
    }

    /** @deprecated Use `JSON.stringify(builder)`. */
    serialize(): string {
        return JSON.stringify(this);
    }

    /**
     * @deprecated Use {@link FenceBuilder.fromJSON}. Note that v1 `serialize()` output is
     * no longer accepted here; use {@link FenceBuilder.fromLegacyJSON} for that.
     */
    hydrate(json: string): Fluent<R> {
        return FenceBuilder.fromJSON(json, this);
    }

    /** Node.js `util.inspect` support, so `console.log(builder)` shows registry and steps. */
    [Symbol.for('nodejs.util.inspect.custom')](): { registry: string[]; steps: readonly Step[] } {
        return { registry: [...this.#entries.keys()], steps: this.#steps };
    }

    #extend(additions: readonly (readonly [string, RegistryEntry])[]): RegistryEntries {
        const entries = new Map(this.#entries);
        for (const [name, entry] of additions) {
            if (typeof name !== 'string' || name === '') {
                throw new RegistrationError('Validator names must be non-empty strings');
            }
            if (typeof entry.fn !== 'function') {
                throw new RegistrationError(`Validator '${name}' must be a function`);
            }
            if (RESERVED_NAMES.has(name)) {
                throw new RegistrationError(
                    `'${name}' is reserved: it would shadow a builder or Object member`,
                );
            }
            if (entries.has(name)) {
                throw new RegistrationError(`'${name}' is already registered`);
            }
            entries.set(name, entry);
        }
        return entries;
    }

    static #hydrate<T extends Registry>(
        entries: RegistryEntries,
        serialized: SerializedFence,
    ): Fluent<T> {
        const missing = [...collectStepNames(serialized)].filter((name) => !entries.has(name));
        if (missing.length > 0) {
            throw new HydrationError(
                `Serialized fence uses unregistered validators: ${missing.join(', ')}`,
                { missing },
            );
        }
        return FenceBuilder.#make<T>(entries, FenceBuilder.#reviveSteps(entries, serialized));
    }

    static #reviveSteps(entries: RegistryEntries, serialized: SerializedFence): readonly Step[] {
        const buildNested = (nested: SerializedFence): Fence =>
            new Fence(entries, FenceBuilder.#reviveSteps(entries, nested));

        return Object.freeze(
            serialized.steps.map(({ name, args }) =>
                createStep(name, reviveArgs(args, buildNested)),
            ),
        );
    }

    static #make<T extends Registry>(entries: RegistryEntries, steps: readonly Step[]): Fluent<T> {
        const builder = new FenceBuilder<T>();
        builder.#entries = entries;
        builder.#steps = steps;
        Object.defineProperties(builder, FenceBuilder.#descriptorsFor(entries));
        return builder as Fluent<T>;
    }

    /**
     * One shared, non-enumerable method per validator, cached per registry so deriving a
     * builder costs a single `defineProperties` call rather than a prototype level.
     */
    static #descriptorsFor(entries: RegistryEntries): PropertyDescriptorMap {
        let descriptors = FenceBuilder.#descriptors.get(entries);
        if (!descriptors) {
            descriptors = {};
            for (const name of entries.keys()) {
                descriptors[name] = {
                    value: function stepMethod(this: FenceBuilder<Registry>, ...args: unknown[]) {
                        return this.step(name, ...args);
                    },
                    enumerable: false,
                    writable: false,
                    configurable: false,
                };
            }
            FenceBuilder.#descriptors.set(entries, descriptors);
        }
        return descriptors;
    }
}

const EMPTY_STEPS: readonly Step[] = Object.freeze([]);

/** Builder members, Object.prototype members and names that would confuse the runtime. */
const RESERVED_NAMES: ReadonlySet<string> = new Set([
    ...Object.getOwnPropertyNames(FenceBuilder.prototype),
    ...Object.getOwnPropertyNames(Object.prototype),
    'prototype',
    'then',
]);

function entriesOf(base: unknown): RegistryEntries {
    if (base instanceof FenceBuilder) {
        return base.entries;
    }
    if (typeof base !== 'object' || base === null) {
        throw new TypeError('fromJSON needs a FenceBuilder or a registry of validators');
    }
    return new Map(
        Object.entries<Validator>(base as Registry).map(([name, fn]): [string, RegistryEntry] => [
            name,
            { fn, options: {} },
        ]),
    );
}

function assertStepName(name: unknown): asserts name is string {
    if (typeof name !== 'string') {
        throw new RegistrationError(`Step names must be strings, got ${typeof name}`);
    }
}
