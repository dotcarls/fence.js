/*
 * Faithful TypeScript port of the v1 `Result`. Behaviour is intentionally
 * unchanged in this commit (including string throws); the core rewrite replaces it.
 */
/* eslint-disable @typescript-eslint/only-throw-error */
import { Invokable } from './invokable.js';

export type Logger = (...parts: unknown[]) => void;

/**
 * Adapter for mapping validation invokables to their results.
 */
export class Result {
    _invokables: unknown[];
    _results: unknown[];
    _subject: unknown;

    constructor(invokables: unknown[] = [], results: unknown[] = [], subject: unknown = null) {
        if (!Array.isArray(invokables) || invokables.length <= 0) {
            throw 'Result must be instantiated with an array containing at least one Invokable';
        }

        if (!Array.isArray(results) || results.length <= 0) {
            throw 'Result must be instantiated with an array containing at least one result';
        }

        if (invokables.length !== results.length) {
            throw 'There must be exactly one result for each Invokable';
        }

        this._invokables = invokables;
        this._results = results;
        this._subject = subject;
    }

    /**
     * `true` if all Results are also `true`, `false` otherwise.
     */
    forAll(): boolean {
        return this._results.reduce<boolean>((acc, result) => {
            if (Array.isArray(result)) {
                return (
                    acc &&
                    result.reduce<boolean>((subAcc, subResult: unknown) => {
                        if (!(subResult instanceof Result)) {
                            throw 'Result results array can only contain booleans or arrays of Results';
                        }

                        return subAcc && subResult.forAll();
                    }, acc)
                );
            }

            return acc && result === true;
        }, true);
    }

    /**
     * `true` if any one Result is also `true`, `false` if all results are `false`.
     */
    forAny(): boolean {
        return this._results.reduce<boolean>((acc, result) => {
            if (Array.isArray(result)) {
                return (
                    acc ||
                    result.reduce<boolean>((subAcc, subResult: unknown) => {
                        if (!(subResult instanceof Result)) {
                            throw 'Result results array can only contain booleans or arrays of Results';
                        }

                        return subAcc || subResult.forAny();
                    }, acc)
                );
            }

            return acc || result === true;
        }, false);
    }

    /**
     * Filters results by Invokable name.
     */
    forOne(name: string): unknown[] {
        if (typeof name !== 'string' || name.length <= 0) {
            throw 'Result forOne must have Invokable name as parameter';
        }

        return this._results.filter((_element, index) => {
            const invokable = this._invokables[index];
            if (!(invokable instanceof Invokable)) {
                throw 'Result invokables array can only contain Invokables';
            }

            return invokable._name === name;
        });
    }

    explain(logger?: Logger, indent?: string): void {
        const log: Logger = logger ?? console.log;
        const pad = indent ?? '  ';

        log(pad, 'subject:', JSON.stringify(this._subject));
        log(pad + pad, this.forAll() ? '[✓]' : '[x]', 'forAll');
        log(pad + pad, this.forAny() ? '[✓]' : '[x]', 'forAny');

        log(pad, 'tests:');
        for (let i = 0; i < this._results.length; i++) {
            const result = this._results[i];
            const invokable = this._invokables[i] as Invokable;
            const testArgs = invokable._args;

            let testLabel = invokable._name;
            if (testArgs.length > 0) {
                testLabel += ` (${JSON.stringify(testArgs)})`;
            }

            log(pad + pad, result ? '[✓]' : '[x]', testLabel);

            if (Array.isArray(result)) {
                for (const subResult of result as Result[]) {
                    subResult.explain(log, pad + pad);
                }
            }
        }
    }
}
