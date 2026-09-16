import { HydrationError, RegistrationError } from './errors.js';
import { Fence, tagFence } from './fence.js';
import {
    collectStepNames,
    createStep,
    parseLegacySerializedFence,
    parseSerializedFence,
    reviveArgs,
    serializeSteps,
} from './internal.js';
import type {
    EmptyRegistry,
    Extend,
    Fluent,
    Merge,
    Registry,
    RegistryEntries,
    RegistryEntry,
    ReservedName,
    SerializedFence,
    Step,
    StepOptions,
    Validator,
    ValidatorArgs,
} from './types.js';

/**
 * Composes fences from a registry of named validators.
 *
 * A builder is an immutable value: {@link FenceBuilder.register}, {@link FenceBuilder.step}
 * and every fluent step method return a new builder and leave the receiver untouched, so a
 * base builder can be derived from any number of times without `fork()` discipline.
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
    static readonly #descriptors = new WeakMap<RegistryEntries, PropertyDescriptorMap>();
    static readonly #registries = new WeakMap<RegistryEntries, Registry>();

    #entries: RegistryEntries = new Map();
    #steps: readonly Step[] = [];

    /** Creates a builder with an empty registry; the same as `new FenceBuilder()`. */
    static create(): Fluent<EmptyRegistry> {
        return new FenceBuilder();
    }

    /**
     * Restores a builder from {@link FenceBuilder.toJSON} output (an object or a JSON string),
     * resolving step names against `base`'s registry. Nested fences are restored with the
     * same registry.
     *
     * @throws {@link HydrationError} when the input is malformed or names unregistered
     * validators. Its `missing` property lists every unknown name.
     */
    static fromJSON<T extends Registry>(json: unknown, base: FenceBuilder<T>): Fluent<T> {
        return FenceBuilder.#hydrate<T>(base.#entries, parseSerializedFence(json));
    }

    /** Restores a builder from the string produced by v1's `serialize()`. */
    static fromLegacyJSON<T extends Registry>(json: string, base: FenceBuilder<T>): Fluent<T> {
        return FenceBuilder.#hydrate<T>(base.#entries, parseLegacySerializedFence(json));
    }

    /** The registered validators by name. */
    get registry(): R {
        let registry = FenceBuilder.#registries.get(this.#entries);
        if (!registry) {
            registry = Object.freeze(
                Object.fromEntries<Validator>(
                    [...this.#entries].map(([name, { fn }]): [string, Validator] => [name, fn]),
                ),
            );
            FenceBuilder.#registries.set(this.#entries, registry);
        }

        return registry as R;
    }

    /** The recorded steps, in execution order. */
    get steps(): readonly Step[] {
        return this.#steps;
    }

    /**
     * Returns a builder whose registry also holds `fn` as `name`, exposing a fluent method
     * `name(...args)` typed from `fn`'s parameters after the subject.
     *
     * @throws {@link RegistrationError} for a duplicate or reserved name, or a non-function.
     */
    register<N extends string, F extends Validator>(
        name: Exclude<N, ReservedName>,
        fn: F,
        options: StepOptions = {},
    ): Fluent<Extend<R, N, F>> {
        return FenceBuilder.#make(this.#extend([[name, { fn, options }]]), this.#steps);
    }

    /** Registers every validator in `validators` under its key. */
    registerAll<V extends Registry>(validators: V): Fluent<Merge<R, V>> {
        const additions = Object.entries(validators).map(([name, fn]): [string, RegistryEntry] => [
            name,
            { fn, options: {} },
        ]);
        return FenceBuilder.#make(this.#extend(additions), this.#steps);
    }

    /**
     * Records a step by name. The fluent methods are sugar for this:
     * `builder.min(4)` is `builder.step('min', 4)`.
     */
    step<K extends keyof R & string>(name: K, ...args: ValidatorArgs<R[K]>): Fluent<R> {
        if (!this.#entries.has(name)) {
            throw new RegistrationError(`No validator is registered as '${name}'`);
        }
        return FenceBuilder.#make(this.#entries, [...this.#steps, createStep(name, args)]);
    }

    /**
     * Builds an immutable {@link Fence} from the recorded steps.
     *
     * @throws {@link EmptyFenceError} when no steps have been recorded.
     */
    build(): Fence<R> {
        return new Fence<R>(this.#entries, this.#steps);
    }

    toJSON(): SerializedFence {
        return serializeSteps(this.#steps, tagFence);
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

    /** @deprecated Use {@link FenceBuilder.fromJSON} (or `fromLegacyJSON` for v1 output). */
    hydrate(json: string): Fluent<R> {
        return FenceBuilder.fromJSON(json, this);
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
                throw new RegistrationError(`'${name}' is reserved and cannot name a validator`);
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
                missing,
            );
        }
        return FenceBuilder.#make<T>(entries, FenceBuilder.#reviveSteps(entries, serialized));
    }

    static #reviveSteps(entries: RegistryEntries, serialized: SerializedFence): Step[] {
        const buildNested = (nested: SerializedFence): Fence =>
            new Fence(entries, FenceBuilder.#reviveSteps(entries, nested));

        return serialized.steps.map(({ name, args }) =>
            createStep(name, reviveArgs(args, buildNested)),
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

/** Names that would shadow builder members or confuse the runtime (`then` makes objects thenable). */
const RESERVED_NAMES: ReadonlySet<string> = new Set([
    ...Object.getOwnPropertyNames(FenceBuilder.prototype),
    'prototype',
    'then',
    '__proto__',
]);
