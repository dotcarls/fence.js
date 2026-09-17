import { EmptyFenceError, RegistrationError } from './errors.js';
import { Result } from './result.js';
import { serializeSteps } from './serialize.js';
import { bindStep, createStep, registryOf, type Runner } from './step.js';
import type { Registry, RegistryEntries, SerializedFence, Step } from './types.js';

/**
 * A built, immutable validation. Run it against one subject at a time, as often as needed;
 * each run returns a {@link Result}. Fences serialize to JSON with `JSON.stringify(fence)` and
 * are restored with `FenceBuilder.fromJSON(json, base).build()`.
 *
 * @typeParam R The registry the fence was built from; the type of {@link Fence.registry}.
 */
export class Fence<R extends Registry = Registry> {
    static {
        Object.defineProperty(Fence.prototype, Symbol.toStringTag, {
            value: 'Fence',
            configurable: true,
        });
    }

    readonly #entries: RegistryEntries;
    readonly #steps: readonly Step[];
    readonly #bound: readonly { readonly step: Step; readonly run: Runner }[];

    /**
     * Binds `steps` to the validators in `entries`. Prefer {@link FenceBuilder.build}, which
     * supplies both. Steps are copied into frozen records.
     *
     * @throws {@link EmptyFenceError} when `steps` is empty.
     * @throws {@link RegistrationError} when a step names a validator that `entries` lacks.
     * @throws TypeError when the arguments are not a Map and an array of `{ name, args }` steps.
     */
    constructor(entries: RegistryEntries, steps: readonly Step[]) {
        // Locals keep the declared types; the guards below would otherwise narrow to `any`.
        const map: RegistryEntries = entries;
        const list: readonly Step[] = steps;
        if (!(entries instanceof Map)) {
            throw new TypeError(
                'Fence entries must be a Map of registry entries (see FenceBuilder.entries)',
            );
        }
        if (!isArray(steps)) {
            throw new TypeError('Fence steps must be an array of steps');
        }
        if (steps.length === 0) {
            throw new EmptyFenceError();
        }

        this.#entries = map;
        this.#steps = Object.freeze(
            list.map((step, index) => {
                if (!isStepLike(step)) {
                    throw new TypeError(
                        `Fence step ${String(index)} must be { name: string, args: unknown[] }`,
                    );
                }
                return createStep(step.name, step.args);
            }),
        );
        this.#bound = this.#steps.map((step) => {
            const entry = map.get(step.name);
            if (!entry) {
                throw new RegistrationError(`No validator is registered as '${step.name}'`);
            }
            return { step, run: bindStep(entry, step) };
        });
    }

    /** The recorded steps, in execution order. */
    get steps(): readonly Step[] {
        return this.#steps;
    }

    /** The validators the fence was built with, by name. */
    get registry(): R {
        return registryOf(this.#entries) as R;
    }

    /**
     * Runs every step against `subject`.
     *
     * Exceptions thrown by a validator propagate unchanged; they are the validator's, not the
     * fence's.
     *
     * @throws {@link InvalidOutcomeError} when a validator returns something other than an outcome.
     */
    run(subject: unknown): Result {
        return new Result(
            subject,
            this.#bound.map(({ step, run }) => Object.freeze({ step, value: run(subject) })),
        );
    }

    /** @throws {@link SerializationError} when a step argument is not a JSON value or a fence. */
    toJSON(): SerializedFence {
        return serializeSteps(this.#steps);
    }

    /** Node.js `util.inspect` support, so `console.log(fence)` shows the steps. */
    [Symbol.for('nodejs.util.inspect.custom')](): { steps: readonly Step[] } {
        return { steps: this.#steps };
    }
}

/** `Array.isArray` without the narrowing to `any[]` that it applies to readonly arrays. */
function isArray(value: unknown): value is readonly unknown[] {
    return Array.isArray(value);
}

function isStepLike(value: unknown): value is Step {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { name?: unknown }).name === 'string' &&
        Array.isArray((value as { args?: unknown }).args)
    );
}
