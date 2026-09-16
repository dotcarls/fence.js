import { EmptyFenceError, RegistrationError } from './errors.js';
import { Result } from './result.js';
import { serializeSteps, type Runner, bindStep } from './internal.js';
import type { Registry, RegistryEntries, SerializedFence, Step } from './types.js';

/**
 * A built, immutable validation. Run it against any number of subjects; each run returns a
 * {@link Result}. Fences serialize to JSON with `JSON.stringify(fence)` and are restored with
 * `FenceBuilder.fromJSON(json, base).build()`.
 *
 * @typeParam R The registry the fence was built from. Kept for symmetry with the builder.
 */
export class Fence<R extends Registry = Registry> {
    readonly #bound: readonly { readonly step: Step; readonly run: Runner }[];

    /** @internal Use {@link FenceBuilder.build}. */
    constructor(entries: RegistryEntries, steps: readonly Step[]) {
        if (steps.length === 0) {
            throw new EmptyFenceError();
        }

        this.#bound = steps.map((step) => {
            const entry = entries.get(step.name);
            if (!entry) {
                throw new RegistrationError(`No validator is registered as '${step.name}'`);
            }
            return { step, run: bindStep(entry, step) };
        });
    }

    /** The recorded steps, in execution order. */
    get steps(): readonly Step[] {
        return this.#bound.map(({ step }) => step);
    }

    readonly [Symbol.toStringTag] = 'Fence';

    /** Runs every step against `subject`. */
    run(subject: unknown): Result {
        return new Result(
            subject,
            this.#bound.map(({ step, run }) => ({ step, value: run(subject) })),
        );
    }

    toJSON(): SerializedFence {
        return serializeSteps(this.steps, tagFence);
    }

    /** Type-level marker only; never assigned. @internal */
    declare readonly __registry?: R;
}

/** Recognises fences nested inside step arguments during serialization. */
export function tagFence(value: object): SerializedFence | undefined {
    return value instanceof Fence ? value.toJSON() : undefined;
}
