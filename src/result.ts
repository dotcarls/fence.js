import { formatCall, formatValue, isPlainObject } from './format.js';
import { toLenientJsonValue } from './serialize.js';
import type {
    Failure,
    Outcome,
    SerializedOutcome,
    SerializedResult,
    StepOutcome,
} from './types.js';

type Nested = readonly Result[] | Readonly<Record<string, Result>>;

/**
 * The entries `createResult` vouches for, set only while it constructs. The constructor trusts
 * exactly that array (by identity) and validates everything else, so no caller of the public
 * constructor can skip validation.
 */
let trustedEntries: readonly StepOutcome[] | null = null;

/**
 * Builds a Result from entries `Fence.run` has already validated (`assertOutcome`), without
 * validating or copying them again. The entries stay private to the Result; callers only ever
 * see the frozen `outcomes` view (FJ-0021). Internal: not exported from the package.
 */
export function createResult(subject: unknown, entries: StepOutcome[]): Result {
    // The constructor consumes and clears the trust; nothing between here and there can throw.
    trustedEntries = entries;
    return new Result(subject, entries);
}

/**
 * The outcome of running a {@link Fence} against one subject: every step paired with what
 * its validator returned.
 *
 * Nested outcomes (arrays or records of `Result`) fold in: {@link Result.passed} needs every
 * nested result to pass and {@link Result.anyPassed} needs any nested result to have any
 * passing step. An empty nested collection is vacuously passed and vacuously not anyPassed,
 * which {@link Result.explain} makes visible.
 *
 * @fence:adr(ADR-0001#decision) @fence:invariant(result.vacuous-empty)
 */
export class Result {
    static {
        Object.defineProperty(Result.prototype, Symbol.toStringTag, {
            value: 'Result',
            configurable: true,
        });
    }

    readonly subject: unknown;

    /** The step outcomes, never exposed: every reader goes through the frozen `outcomes` view. */
    readonly #entries: readonly StepOutcome[];

    /** The frozen public view of `#entries`, built on first access. */
    #outcomes: readonly StepOutcome[] | undefined;

    /**
     * Results are normally created by {@link Fence.run}. Constructing one directly is useful
     * in tests and in higher-order validators.
     *
     * @throws TypeError when `outcomes` is not an array of `{ step: { name, args }, value }`
     * with an {@link Outcome} as `value`.
     */
    constructor(subject: unknown, outcomes: readonly StepOutcome[]) {
        this.subject = subject;
        if (trustedEntries !== null && trustedEntries === outcomes) {
            this.#entries = trustedEntries;
            trustedEntries = null;
        } else {
            const frozen = freezeOutcomes(outcomes);
            this.#entries = frozen;
            this.#outcomes = frozen;
        }
    }

    /**
     * Every step paired with its outcome, in step order. The array and each entry are frozen; the
     * view is built once, on first access, so runs that only read verdicts never pay for it.
     */
    get outcomes(): readonly StepOutcome[] {
        this.#outcomes ??= Object.freeze(
            this.#entries.map(({ step, value }) => Object.freeze({ step, value })),
        );
        return this.#outcomes;
    }

    /** `true` when every step (and every nested result) passed. */
    get passed(): boolean {
        return this.#entries.every(({ value }) => outcomePassed(value));
    }

    /** `true` when at least one step (or one nested step) passed. */
    get anyPassed(): boolean {
        return this.#entries.some(({ value }) => outcomeAnyPassed(value));
    }

    /** The outcomes of every step recorded under `name`, in order. */
    for(name: string): Outcome[] {
        return this.#entries.filter(({ step }) => step.name === name).map(({ value }) => value);
    }

    /**
     * Every failed step, flattened. Nested results contribute their key (record) or index
     * (array) to the path, so a policy failure reads `['policy', 'password', 'min']`.
     */
    failures(): Failure[] {
        const failures: Failure[] = [];

        for (const { step, value } of this.#entries) {
            if (typeof value === 'boolean') {
                if (!value) {
                    failures.push({ path: [step.name], step, subject: this.subject });
                }
                continue;
            }

            for (const [key, nested] of entriesOf(value)) {
                for (const failure of nested.failures()) {
                    failures.push({ ...failure, path: [step.name, key, ...failure.path] });
                }
            }
        }

        return failures;
    }

    /** A human-readable, multi-line report. Returns text; nothing is logged. */
    explain(): string {
        return this.#lines('').join('\n');
    }

    /**
     * A plain-data description for logging or transport. Nested fences in step arguments are
     * tagged as in {@link Fence.toJSON}; the subject and any argument that is not a JSON value
     * are described as strings rather than throwing.
     */
    toJSON(): SerializedResult {
        return {
            subject: toLenientJsonValue(this.subject, 'subject'),
            passed: this.passed,
            outcomes: this.#entries.map(({ step, value }): SerializedOutcome => ({
                name: step.name,
                args: step.args.map((arg, index) =>
                    toLenientJsonValue(arg, `args[${String(index)}]`),
                ),
                value: serializeOutcome(value),
            })),
        };
    }

    /** Node.js `util.inspect` support, so `console.log(result)` shows the outcomes. */
    [Symbol.for('nodejs.util.inspect.custom')](): {
        subject: unknown;
        passed: boolean;
        outcomes: { step: string; value: Outcome }[];
    } {
        return {
            subject: this.subject,
            passed: this.passed,
            outcomes: this.#entries.map(({ step, value }) => ({
                step: formatCall(step.name, step.args),
                value,
            })),
        };
    }

    #lines(indent: string): string[] {
        const passedCount = this.#entries.filter(({ value }) => outcomePassed(value)).length;
        const verdict = this.passed ? 'PASSED' : 'FAILED';
        const lines = [
            `${indent}subject: ${formatValue(this.subject)}`,
            `${indent}${verdict} (${String(passedCount)}/${String(this.#entries.length)} steps)`,
        ];

        for (const { step, value } of this.#entries) {
            const mark = outcomePassed(value) ? '[✓]' : '[x]';
            lines.push(`${indent}  ${mark} ${formatCall(step.name, step.args)}`);

            if (typeof value === 'boolean') {
                continue;
            }

            const nested = entriesOf(value);
            if (nested.length === 0) {
                lines.push(`${indent}      (no nested results)`);
            }
            for (const [key, result] of nested) {
                lines.push(`${indent}      ${key}:`);
                lines.push(...result.#lines(`${indent}        `));
            }
        }

        return lines;
    }
}

/** `true` for a (non-sparse) array whose every item is a {@link Result}. */
export function isResultList(value: unknown): value is readonly Result[] {
    if (!Array.isArray(value)) {
        return false;
    }
    // for...of visits holes (as undefined), unlike every(), so sparse arrays are rejected.
    for (const item of value) {
        if (!(item instanceof Result)) {
            return false;
        }
    }
    return true;
}

/** `true` for a plain object whose every value is a {@link Result}. */
export function isResultRecord(value: unknown): value is Readonly<Record<string, Result>> {
    return isPlainObject(value) && Object.values(value).every((item) => item instanceof Result);
}

function freezeOutcomes(value: unknown): readonly StepOutcome[] {
    if (!Array.isArray(value)) {
        throw new TypeError('Result outcomes must be an array of { step, value }');
    }
    const frozen: StepOutcome[] = [];
    let index = 0;
    // for...of visits holes as undefined, so a sparse array is rejected like any other bad entry.
    for (const entry of value as readonly unknown[]) {
        if (!isStepOutcome(entry)) {
            throw new TypeError(
                `Result outcome ${String(index)} must be { step: { name, args }, value }, ` +
                    'where value is a boolean, an array of Results or a record of Results',
            );
        }
        frozen.push(
            Object.isFrozen(entry)
                ? entry
                : Object.freeze({ step: entry.step, value: entry.value }),
        );
        index += 1;
    }
    return Object.freeze(frozen);
}

function isStepOutcome(value: unknown): value is StepOutcome {
    if (typeof value !== 'object' || value === null || !('step' in value) || !('value' in value)) {
        return false;
    }
    const { step, value: outcome } = value;
    return (
        typeof step === 'object' &&
        step !== null &&
        typeof (step as { name?: unknown }).name === 'string' &&
        Array.isArray((step as { args?: unknown }).args) &&
        (typeof outcome === 'boolean' || isResultList(outcome) || isResultRecord(outcome))
    );
}

function serializeOutcome(
    value: Outcome,
): boolean | readonly SerializedResult[] | Readonly<Record<string, SerializedResult>> {
    if (typeof value === 'boolean') {
        return value;
    }
    if (isList(value)) {
        return value.map((result) => result.toJSON());
    }
    return Object.fromEntries(Object.entries(value).map(([key, result]) => [key, result.toJSON()]));
}

function isList(value: Nested): value is readonly Result[] {
    return Array.isArray(value);
}

function entriesOf(value: Nested): [string, Result][] {
    return isList(value)
        ? value.map((result, index): [string, Result] => [String(index), result])
        : Object.entries(value);
}

function nestedOf(value: Nested): readonly Result[] {
    return isList(value) ? value : Object.values(value);
}

function outcomePassed(value: Outcome): boolean {
    return typeof value === 'boolean' ? value : nestedOf(value).every((result) => result.passed);
}

function outcomeAnyPassed(value: Outcome): boolean {
    return typeof value === 'boolean' ? value : nestedOf(value).some((result) => result.anyPassed);
}
