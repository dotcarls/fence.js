/*
 * Faithful TypeScript port of the v1 `Invokable`. Behaviour is intentionally
 * unchanged in this commit (including string throws); the core rewrite replaces it.
 */
/* eslint-disable @typescript-eslint/only-throw-error */

export type Validator = (...args: any[]) => unknown;

type MemoizedFn = ((fn: Validator, ...args: unknown[]) => unknown) & {
    cache: Record<string, unknown>;
};

/**
 * A validation function that will be invoked at some time.
 */
export class Invokable {
    _name: string;
    _fn: Validator;
    _args: unknown[];
    _memoize: boolean;
    // `declare` keeps these off the instance until memoize() defines them, as in v1.
    declare _cache?: Record<string, unknown>;
    declare _memoizedFn?: MemoizedFn;

    constructor(fn: Validator, name: string | null = '', args: unknown[] = [], memoize = false) {
        if (typeof fn !== 'function') {
            throw 'Invokable must be instantiated with a function';
        }

        if (fn.name === '' && name === '') {
            throw 'Invokable anonymous functions must have a name argument';
        }

        if (!Array.isArray(args)) {
            throw 'Invokable arguments must be an array';
        }

        if (typeof memoize !== 'boolean') {
            throw 'Invokable memoize argument must be boolean';
        }

        this._name = name?.length ? name : fn.name;
        this._fn = fn;
        this._args = args;
        this._memoize = memoize;

        if (this._memoize) {
            this.memoize();
        }
    }

    /**
     * Executes a validation function against a subject and any predefined arguments.
     */
    invoke(...subjects: unknown[]): unknown {
        let fn: Validator = this._fn;
        let args: unknown[] = subjects.concat(this._args);

        if (this._memoize && this._memoizedFn) {
            fn = this._memoizedFn;
            args = [this._fn, ...args];
        }

        return fn.apply(this, args);
    }

    /**
     * Create a private, non-enumerable and non-writable `_cache` property, as well
     * as a `_memoizedFn` property.
     */
    memoize(): void {
        const cache: Record<string, unknown> = {};
        Object.defineProperty(this, '_cache', {
            value: cache,
            writable: false,
            configurable: true,
            enumerable: false,
        });

        const memoized = function (fn: Validator, ...args: unknown[]): unknown {
            const key = String(args.length ? args[0] : 'none');
            const cache = memoized.cache;

            if (cache[key]) {
                return cache[key];
            }

            const result = fn.apply(fn, args);
            cache[key] = result;

            return result;
        } as MemoizedFn;

        memoized.cache = cache;
        this._memoizedFn = memoized;
    }

    /**
     * Remove the `_cache` property and `_memoizedFn`. Set `_memoize` to false
     * so that `_fn` is called.
     */
    dememoize(): void {
        delete this._cache;
        delete this._memoizedFn;
        this._memoize = false;
    }

    /**
     * Represent an Invokable as a string.
     */
    serialize(): string {
        return JSON.stringify(this);
    }
}
