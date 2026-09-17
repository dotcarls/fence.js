import { formatCall, formatValue } from './format.js';
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
 * The outcome of running a {@link Fence} against one subject: every step paired with what
 * its validator returned.
 *
 * Nested outcomes (arrays or records of `Result`) fold in: {@link Result.passed} needs every
 * nested result to pass and {@link Result.anyPassed} needs any nested result to have any
 * passing step. An empty nested collection is vacuously passed and vacuously not anyPassed,
 * which {@link Result.explain} makes visible.
 */
export class Result {
    static {
        Object.defineProperty(Result.prototype, Symbol.toStringTag, {
            value: 'Result',
            configurable: true,
        });
    }

    readonly subject: unknown;
    readonly outcomes: readonly StepOutcome[];

    /**
     * Results are normally created by {@link Fence.run}. Constructing one directly is useful
     * in tests and in higher-order validators.
     *
     * @throws TypeError when `outcomes` is not an array of `{ step: { name, args }, value }`.
     */
    constructor(subject: unknown, outcomes: readonly StepOutcome[]) {
        this.subject = subject;
        this.outcomes = freezeOutcomes(outcomes);
    }

    /** `true` when every step (and every nested result) passed. */
    get passed(): boolean {
        return this.outcomes.every(({ value }) => outcomePassed(value));
    }

    /** `true` when at least one step (or one nested step) passed. */
    get anyPassed(): boolean {
        return this.outcomes.some(({ value }) => outcomeAnyPassed(value));
    }

    /** The outcomes of every step recorded under `name`, in order. */
    for(name: string): Outcome[] {
        return this.outcomes.filter(({ step }) => step.name === name).map(({ value }) => value);
    }

    /**
     * Every failed step, flattened. Nested results contribute their key (record) or index
     * (array) to the path, so a policy failure reads `['policy', 'password', 'min']`.
     */
    failures(): Failure[] {
        const failures: Failure[] = [];

        for (const { step, value } of this.outcomes) {
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
     * tagged as in {@link Fence.toJSON}; arguments that are not JSON values are described as
     * strings rather than throwing.
     */
    toJSON(): SerializedResult {
        return {
            subject: this.subject,
            passed: this.passed,
            outcomes: this.outcomes.map(({ step, value }): SerializedOutcome => ({
                name: step.name,
                args: step.args.map((arg, index) =>
                    toLenientJsonValue(arg, `args[${String(index)}]`),
                ),
                value: serializeOutcome(value),
            })),
        };
    }

    /** @deprecated Use {@link Result.passed}. */
    forAll(): boolean {
        return this.passed;
    }

    /** @deprecated Use {@link Result.anyPassed}. */
    forAny(): boolean {
        return this.anyPassed;
    }

    /** @deprecated Use {@link Result.for}. */
    forOne(name: string): Outcome[] {
        return this.for(name);
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
            outcomes: this.outcomes.map(({ step, value }) => ({
                step: formatCall(step.name, step.args),
                value,
            })),
        };
    }

    #lines(indent: string): string[] {
        const passedCount = this.outcomes.filter(({ value }) => outcomePassed(value)).length;
        const verdict = this.passed ? 'PASSED' : 'FAILED';
        const lines = [
            `${indent}subject: ${formatValue(this.subject)}`,
            `${indent}${verdict} (${String(passedCount)}/${String(this.outcomes.length)} steps)`,
        ];

        for (const { step, value } of this.outcomes) {
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

function freezeOutcomes(value: unknown): readonly StepOutcome[] {
    if (!Array.isArray(value)) {
        throw new TypeError('Result outcomes must be an array of { step, value }');
    }
    return Object.freeze(
        Array.from(value as readonly unknown[], (entry, index) => {
            if (!isStepOutcome(entry)) {
                throw new TypeError(
                    `Result outcome ${String(index)} must be { step: { name, args }, value }`,
                );
            }
            return Object.isFrozen(entry)
                ? entry
                : Object.freeze({ step: entry.step, value: entry.value });
        }),
    );
}

function isStepOutcome(value: unknown): value is StepOutcome {
    if (typeof value !== 'object' || value === null || !('step' in value) || !('value' in value)) {
        return false;
    }
    const { step } = value as { step: unknown };
    return (
        typeof step === 'object' &&
        step !== null &&
        typeof (step as { name?: unknown }).name === 'string' &&
        Array.isArray((step as { args?: unknown }).args)
    );
}

function serializeOutcome(
    value: Outcome,
): boolean | readonly SerializedResult[] | Readonly<Record<string, SerializedResult>> {
    if (typeof value === 'boolean') {
        return value;
    }
    if (isResultList(value)) {
        return value.map((result) => result.toJSON());
    }
    return Object.fromEntries(Object.entries(value).map(([key, result]) => [key, result.toJSON()]));
}

function isResultList(value: Nested): value is readonly Result[] {
    return Array.isArray(value);
}

function entriesOf(value: Nested): [string, Result][] {
    return isResultList(value)
        ? value.map((result, index): [string, Result] => [String(index), result])
        : Object.entries(value);
}

function nestedOf(value: Nested): readonly Result[] {
    return isResultList(value) ? value : Object.values(value);
}

function outcomePassed(value: Outcome): boolean {
    return typeof value === 'boolean' ? value : nestedOf(value).every((result) => result.passed);
}

function outcomeAnyPassed(value: Outcome): boolean {
    return typeof value === 'boolean' ? value : nestedOf(value).some((result) => result.anyPassed);
}
