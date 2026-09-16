import type { Invokable } from './invokable.js';
import { Result } from './result.js';

/**
 * A 'built' FenceBuilder that can be exported for use in other functions.
 */
export class Fence {
    _invokables: Invokable[];

    constructor(invokables: Invokable[]) {
        this._invokables = invokables;
    }

    /**
     * Iterates over the invokables. Each invokable is called with the subject(s)
     * being validated.
     */
    run(...subjects: unknown[]): Result {
        const invokables = this._invokables;
        const results = invokables.map((invokable) => invokable.invoke(...subjects));

        return new Result(invokables, results, subjects);
    }
}
