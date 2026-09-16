import { formatValue } from './format.js';
import type { Step } from './types.js';

/** Base class of every error thrown by fence.js. */
export class FenceError extends Error {
    override readonly name: string = 'FenceError';
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

/** Serialized input is malformed or names validators that are not registered. */
export class HydrationError extends FenceError {
    override readonly name = 'HydrationError';

    /** Validator names present in the input but absent from the registry. */
    readonly missing: readonly string[];

    constructor(message: string, missing: readonly string[] = [], options?: ErrorOptions) {
        super(message, options);
        this.missing = missing;
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
