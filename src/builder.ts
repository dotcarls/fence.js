/*
 * Faithful TypeScript port of the v1 `FenceBuilder`. Behaviour is intentionally
 * unchanged in this commit; the core rewrite replaces it.
 *
 * One forced deviation: v1 forked by calling `FenceBuilder.call(this, ...)` from a
 * plain constructor function, which only works for Babel-compiled ES5 classes.
 * Native classes throw on that, so the fork is expressed with `Object.setPrototypeOf`,
 * which produces the identical prototype chain.
 */
/* eslint-disable @typescript-eslint/only-throw-error */
import { Fence } from './fence.js';
import { Invokable, type Validator } from './invokable.js';

/** The dynamically registered step methods; typed loosely until the core rewrite. */
export type StepMethods = Record<string, (...args: unknown[]) => FluentBuilder>;
export type FluentBuilder = FenceBuilder & StepMethods;

interface SerializedInvokable {
    _name: string;
    _args: unknown[];
}

/**
 * A `FenceBuilder` is used to create an extensible `Fence`.
 */
export class FenceBuilder {
    _invokables: Invokable[];

    constructor(invokables?: Invokable[]) {
        if (typeof invokables !== 'undefined' && !Array.isArray(invokables)) {
            throw 'FenceBuilder constructor argument can only be an Array';
        }

        this._invokables = invokables ? invokables.slice() : [];
    }

    /**
     * Create a clone of a `FenceBuilder` instance so that it can be extended.
     */
    fork(proto?: object): FluentBuilder {
        const parent: object = proto ?? (Object.getPrototypeOf(this) as object);
        const child = new FenceBuilder(this._invokables);
        Object.setPrototypeOf(child, Object.create(parent) as object);

        return child as FluentBuilder;
    }

    /**
     * Add a named function reference to the prototype of this `FenceBuilder`.
     */
    register(fn: Validator, name?: string | null, memoize?: boolean): FluentBuilder {
        const proto = Object.getPrototypeOf(this) as Record<string, unknown>;
        const invokableName = name ?? '';
        proto[invokableName || fn.name] = function (this: FenceBuilder, ...args: unknown[]) {
            this._invokables.push(new Invokable(fn, invokableName, args, memoize ?? false));

            return this;
        };

        return this.fork(proto);
    }

    /**
     * Convert this `FenceBuilder` to a `Fence` that can validate values.
     */
    build(): Fence {
        return new Fence(this._invokables);
    }

    /**
     * Stringified JSON blob that can be persisted and later `hydrate()`d.
     */
    serialize(): string {
        return JSON.stringify(this._invokables.map((invokable) => invokable.serialize()));
    }

    /**
     * Recreate a list of `Invokables` from a `serialize()`d `FenceBuilder`.
     */
    hydrate(invokables: string): FluentBuilder {
        const tmp = this.fork();
        tmp._invokables = [];

        const parsed = JSON.parse(invokables) as string[];
        for (const raw of parsed) {
            const invokable = JSON.parse(raw) as SerializedInvokable;
            const proto = Object.getPrototypeOf(tmp) as Record<string, unknown>;
            const fn = proto[invokable._name];

            if (typeof fn === 'function') {
                (fn as (...args: unknown[]) => unknown).apply(tmp, invokable._args);
            } else {
                throw new Error(
                    `Method ${invokable._name} missing during validation builder hydration`,
                );
            }
        }

        return tmp;
    }
}
