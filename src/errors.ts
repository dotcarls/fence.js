import { formatValue } from './format.js';
import type { Step } from './types.js';

/** Structural stand-in for `ErrorOptions`, so the declarations do not require the ES2022 lib. */
export interface FenceErrorOptions {
    readonly cause?: unknown;
}

/**
 * Base class of every error fence.js raises about validation input or state. Arguments of the
 * wrong JavaScript type (a non-Map to the `Fence` constructor, a non-object `base` to
 * `fromJSON`) raise a plain `TypeError` instead.
 */
export class FenceError extends Error {
    override readonly name: string = 'FenceError';

    // eslint-disable-next-line @typescript-eslint/no-useless-constructor -- narrows the options type in the declarations
    constructor(message: string, options?: FenceErrorOptions) {
        super(message, options);
    }
}

/** A validator could not be registered, or a step names a validator that is not registered. */
export class RegistrationError extends FenceError {
    override readonly name = 'RegistrationError';
}

/** `build()` was called on a builder with no steps. */
export class EmptyFenceError extends FenceError {
    override readonly name = 'EmptyFenceError';

    constructor(message = 'Cannot build a fence with no steps') {
        super(message);
    }
}

/** A step argument cannot be represented as JSON. */
export class SerializationError extends FenceError {
    override readonly name = 'SerializationError';
}

export interface HydrationErrorOptions extends FenceErrorOptions {
    /** Validator names present in the input but absent from the registry. */
    readonly missing?: readonly string[];
}

/** Serialized input is malformed or names validators that are not registered. */
export class HydrationError extends FenceError {
    override readonly name = 'HydrationError';

    /** Validator names present in the input but absent from the registry. */
    readonly missing: readonly string[];

    constructor(message: string, options: HydrationErrorOptions = {}) {
        super(message, options);
        this.missing = options.missing ?? [];
    }
}

/** A validator returned something other than a boolean or nested results. */
export class InvalidOutcomeError extends FenceError {
    override readonly name = 'InvalidOutcomeError';

    readonly step: Step;
    readonly value: unknown;

    constructor(step: Step, value: unknown) {
        super(
            `Validator '${step.name}' returned ${formatValue(value)}; ` +
                'expected a boolean, an array of Results or a record of Results',
        );
        this.step = step;
        this.value = value;
    }
}
