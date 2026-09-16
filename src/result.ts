import { formatCall, formatValue } from './format.js';
import type { Failure, Outcome, StepOutcome } from './types.js';

/**
 * The outcome of running a {@link Fence} against one subject: every step paired with what
 * its validator returned.
 *
 * Nested outcomes (arrays or records of `Result`) are folded in: {@link Result.passed} needs
 * every nested result to pass and {@link Result.anyPassed} needs any nested result to have
 * any passing step. An empty nested collection is vacuously passed and vacuously not
 * anyPassed, which {@link Result.explain} makes visible.
 */
export class Result {
    readonly subject: unknown;
    readonly outcomes: readonly StepOutcome[];

    constructor(subject: unknown, outcomes: readonly StepOutcome[]) {
        const list: readonly StepOutcome[] = outcomes;
        if (!Array.isArray(outcomes)) {
            throw new TypeError('Result outcomes must be an array of { step, value }');
        }
        this.subject = subject;
        this.outcomes = Object.freeze([...list]);
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
        return this.lines('').join('\n');
    }

    toJSON(): {
        subject: unknown;
        passed: boolean;
        outcomes: { name: string; args: readonly unknown[]; value: Outcome }[];
    } {
        return {
            subject: this.subject,
            passed: this.passed,
            outcomes: this.outcomes.map(({ step, value }) => ({
                name: step.name,
                args: step.args,
                value,
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

    private lines(indent: string): string[] {
        const passedCount = this.outcomes.filter(({ value }) => outcomePassed(value)).length;
        const lines = [
            `${indent}subject: ${formatValue(this.subject)}`,
            `${indent}${this.passed ? 'PASSED' : 'FAILED'} (${String(passedCount)}/${String(this.outcomes.length)} steps)`,
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
                lines.push(...result.lines(`${indent}        `));
            }
        }

        return lines;
    }
}

type Nested = readonly Result[] | Readonly<Record<string, Result>>;

function isResultList(value: Nested): value is readonly Result[] {
    return Array.isArray(value);
}

function entriesOf(value: Nested): [string, Result][] {
    return isResultList(value)
        ? value.map((result, index): [string, Result] => [String(index), result])
        : Object.entries(value);
}

function outcomePassed(value: Outcome): boolean {
    return typeof value === 'boolean' ? value : nestedOf(value).every((result) => result.passed);
}

function outcomeAnyPassed(value: Outcome): boolean {
    return typeof value === 'boolean' ? value : nestedOf(value).some((result) => result.anyPassed);
}

function nestedOf(value: Nested): readonly Result[] {
    return isResultList(value) ? value : Object.values(value);
}
