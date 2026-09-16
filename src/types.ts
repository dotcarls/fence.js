import type { FenceBuilder } from './builder.js';
import type { Result } from './result.js';

/**
 * What a validator may return.
 *
 * - `boolean`: the verdict for this step.
 * - `readonly Result[]` or `Readonly<Record<string, Result>>`: nested results, produced by
 *   higher-order validators that run other fences (a "policy of fences"). Record keys and
 *   array indices become path segments in {@link Result.failures}.
 */
export type Outcome = boolean | readonly Result[] | Readonly<Record<string, Result>>;

/**
 * A validation function. The first parameter is the subject passed to {@link Fence.run};
 * the remaining parameters are the arguments recorded by the fluent step method.
 *
 * `any` is deliberate here: it is what lets validators declare precise parameter types
 * (`(v: string, n: number) => boolean`) and still be stored together in one registry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Validator = (subject: any, ...args: any[]) => Outcome;

/** A set of validators keyed by the name used in the fluent API and in serialized fences. */
export type Registry = Readonly<Record<string, Validator>>;

/** The registry of a freshly created builder. */
// eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- an empty registry is intentionally the empty object type
export type EmptyRegistry = Record<never, Validator>;

/** The parameters of a validator after the subject: what its fluent step method accepts. */
export type ValidatorArgs<F> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    F extends (subject: any, ...args: infer A) => Outcome ? A : never;

/** Flattens an intersection into a single object type, for readable hover text. */
export type Simplify<T> = { [K in keyof T]: T[K] };

/** `R` with validator `F` registered as `N`. */
export type Extend<R extends Registry, N extends string, F extends Validator> =
    Simplify<R & Record<N, F>> extends infer X extends Registry ? X : never;

/** `R` merged with the validators in `V`. */
export type Merge<R extends Registry, V extends Registry> =
    Simplify<R & V> extends infer X extends Registry ? X : never;

/** Names that cannot be used for validators because they would shadow builder members. */
export type ReservedName = keyof FenceBuilder | 'constructor' | 'prototype' | 'then' | '__proto__';

/** The fluent step methods derived from a registry: one method per validator. */
export type StepMethods<R extends Registry> = {
    readonly [K in keyof R & string]: (...args: ValidatorArgs<R[K]>) => Fluent<R>;
};

/** A builder together with the fluent step methods for its registry. */
export type Fluent<R extends Registry> = FenceBuilder<R> & StepMethods<R>;

/** One recorded validation step: a validator name and the arguments to apply after the subject. */
export interface Step {
    readonly name: string;
    readonly args: readonly unknown[];
}

export interface MemoizeOptions {
    /**
     * Derives the cache key from the subject. Defaults to the subject itself. Primitive keys
     * are compared with SameValueZero; object keys are held weakly by identity.
     */
    readonly key?: (subject: unknown) => unknown;
}

export interface StepOptions {
    /**
     * Cache outcomes per subject. Only valid for pure validators. The cache belongs to the
     * built {@link Fence}, so fences built from the same builder never share results.
     */
    readonly memoize?: boolean | MemoizeOptions;
}

/** @internal */
export interface RegistryEntry {
    readonly fn: Validator;
    readonly options: StepOptions;
}

/** @internal */
export type RegistryEntries = ReadonlyMap<string, RegistryEntry>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
    JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** A serialized step. Nested fences appear in `args` as `{ "$fence": SerializedFence }`. */
export interface SerializedStep {
    readonly name: string;
    readonly args: readonly JsonValue[];
}

/** The portable JSON form of a builder or fence (format version 2). */
export interface SerializedFence {
    readonly fence: 2;
    readonly steps: readonly SerializedStep[];
}

/** A step paired with what its validator returned for one subject. */
export interface StepOutcome {
    readonly step: Step;
    readonly value: Outcome;
}

/** One failed step, located by the path of step names and nested keys that lead to it. */
export interface Failure {
    readonly path: readonly string[];
    readonly step: Step;
    readonly subject: unknown;
}
