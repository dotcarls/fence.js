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
 * the remaining parameters are the arguments recorded by the fluent step method. Fences call
 * validators as plain functions, hence `this: void`.
 *
 * `any` is deliberate: it lets validators declare precise parameter types
 * (`(v: string, n: number) => boolean`) and still be stored together in one registry. It also
 * means that *unannotated* parameters are `any`; annotate them to get typed step methods.
 * Overloaded validators contribute only their last overload.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Validator = (this: void, subject: any, ...args: any[]) => Outcome;

/** Validators keyed by the name used in the fluent API and in serialized fences. */
export type Registry = Readonly<Record<string, Validator>>;

/** The registry of a freshly created builder. */
// eslint-disable-next-line @typescript-eslint/no-generated-empty-object-type -- an empty registry is intentionally the empty object type
export type EmptyRegistry = Record<never, Validator>;

/** The parameters of a validator after the subject: what its fluent step method accepts. */
export type ValidatorArgs<F> =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    F extends (subject: any, ...args: infer A) => Outcome ? A : never;

/**
 * Flattens an intersection into one object type so hover text shows the resolved registry.
 * The `& {}` is what makes TypeScript display the flattened type instead of nested alias names.
 */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** `true` when `T` is a union of two or more members. */
export type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;

/** `true` when `R` has a string index signature, i.e. its validator names are not known statically. */
export type IsWide<R> = string extends keyof R ? true : false;

/** The statically known keys of `R` (a string index signature is excluded). */
export type KnownKeys<R> = keyof R extends infer K
    ? K extends string
        ? string extends K
            ? never
            : K
        : never
    : never;

/** Names that cannot be used for validators because they would shadow builder or Object members. */
export type ReservedName =
    | keyof FenceBuilder
    | 'constructor'
    | 'hasOwnProperty'
    | 'isPrototypeOf'
    | 'propertyIsEnumerable'
    | 'toLocaleString'
    | 'toString'
    | 'valueOf'
    | 'prototype'
    | 'then'
    | '__proto__';

/**
 * Validates a name passed to {@link FenceBuilder.register}. Invalid names resolve to a
 * sentence, so the compiler error reads as the explanation. A non-literal `string` is
 * allowed and widens the registry (see {@link Extend}).
 */
export type StepName<R extends Registry, N extends string> = string extends N
    ? N
    : IsUnion<N> extends true
      ? 'Register one name at a time, not a union of names'
      : N extends ReservedName
        ? `'${N}' is reserved: it would shadow a builder or Object member`
        : N extends KnownKeys<R>
          ? `'${N}' is already registered`
          : N;

/** Validates a record passed to {@link FenceBuilder.registerAll}: offending keys become a sentence. */
export type Registrable<R extends Registry, V extends Registry> =
    IsWide<V> extends true
        ? V
        : V & {
              readonly [
                  K in keyof V & (ReservedName | KnownKeys<R>)
              ]: `'${K & string}' is reserved or already registered`;
          };

/**
 * `R` with validator `F` registered as `N`. Registering under a non-literal `string` name
 * widens the registry to {@link Registry}: every fluent method then accepts any arguments,
 * and the registry stays wide from then on.
 */
export type Extend<R extends Registry, N extends string, F extends Validator> =
    IsWide<R> extends true
        ? Registry
        : string extends N
          ? Registry
          : Simplify<R & Readonly<Record<N, F>>> extends infer X extends Registry
            ? X
            : never;

/** `R` merged with the validators in `V` (made readonly); a wide `V` widens the result to {@link Registry}. */
export type Merge<R extends Registry, V extends Registry> =
    IsWide<R> extends true
        ? Registry
        : IsWide<V> extends true
          ? Registry
          : Simplify<R & Readonly<V>> extends infer X extends Registry
            ? X
            : never;

/**
 * The fluent step methods derived from a registry: one precisely typed method per known
 * validator, plus an index signature when the registry is wide.
 */
export type StepMethods<R extends Registry> = {
    readonly [K in KnownKeys<R>]: (...args: ValidatorArgs<R[K]>) => Fluent<R>;
} & (IsWide<R> extends true ? Readonly<Record<string, (...args: any[]) => Fluent<R>>> : unknown);

/** A builder together with the fluent step methods for its registry. */
export type Fluent<R extends Registry> = FenceBuilder<R> & StepMethods<R>;

/**
 * One recorded validation step: a validator name and the arguments to apply after the
 * subject. Arguments are held by reference, not copied.
 */
export interface Step {
    readonly name: string;
    readonly args: readonly unknown[];
}

export interface MemoizeOptions {
    /**
     * Derives the cache key from the subject. Defaults to the subject itself. Primitive keys
     * are compared with SameValueZero; object and function keys are held weakly by identity.
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

/** A registered validator together with its options. */
export interface RegistryEntry {
    readonly fn: Validator;
    readonly options: StepOptions;
}

/** The internal form of a registry, as exposed by {@link FenceBuilder.entries}. */
export type RegistryEntries = ReadonlyMap<string, RegistryEntry>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
    JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/* eslint-disable @typescript-eslint/consistent-type-definitions -- type aliases, not interfaces, so that these are assignable to JsonValue */

/** A serialized step. Nested fences appear in `args` as `{ "$fence": SerializedFence }`. */
export type SerializedStep = {
    readonly name: string;
    readonly args: readonly JsonValue[];
};

/** The portable JSON form of a builder or fence (format version 2). */
export type SerializedFence = {
    readonly fence: 2;
    readonly steps: readonly SerializedStep[];
};

/* eslint-enable @typescript-eslint/consistent-type-definitions */

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

/** One outcome in {@link SerializedResult}; non-JSON arguments are described as strings. */
export interface SerializedOutcome {
    readonly name: string;
    readonly args: readonly JsonValue[];
    readonly value:
        boolean | readonly SerializedResult[] | Readonly<Record<string, SerializedResult>>;
}

/** The JSON form of a {@link Result}, for logging and transport of diagnostics. */
export interface SerializedResult {
    readonly subject: unknown;
    readonly passed: boolean;
    readonly outcomes: readonly SerializedOutcome[];
}
