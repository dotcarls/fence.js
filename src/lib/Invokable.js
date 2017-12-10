/**
* A validation function that will be invoked at some time
*/
class Invokable {
    /**
    * @param    {Function}     fn      [required] function reference that is executed during invokation
    * @param    {String}       name    [required] required if function is anonymous
    *                                             will override function name property
    * @param    {Array}        args    [optional] arguments to be applied to the function
    * @param    {Boolean}      memoize [optional] when true, function calls are memoized
    */
    constructor (fn, name = ``, args = [], memoize = false) {
        if (!fn || typeof fn !== `function`) {
            throw `Invokable must be instantiated with a function`;
        }

        if (fn.name === `` && name === ``) {
            throw `Invokable anonymous functions must have a name argument`;
        }

        if (!Array.isArray(args)) {
            throw `Invokable arguments must be an array`;
        }

        if (typeof memoize !== `boolean`) {
            throw `Invokable memoize argument must be boolean`;
        }

        this._name = name && name.length ? name : fn.name;
        this._fn = fn;
        this._args = args;
        this._memoize = memoize;

        if (this._memoize) {
            this.memoize();
        }
    }

    /**
    * Executes a validation function against a subject and any predefined arguments
    *
    * @method    invoke
    * @param     {Any}         subject    the value to be validated
    * @return    {Boolean}                the result of the validation
    */
    invoke (...subjects) {
        let fn = this._fn;
        let args = subjects.concat(this._args);

        if (this._memoize && this._memoizedFn) {
            fn = this._memoizedFn;
            args = [this._fn].concat(args);
        }

        return fn.apply(this, args);
    }

    /**
     * Create a private, non-enumerable and non-writable `_cache` property, as well
     * as a `_memoizedFn` property. Calling an `Invokable`'s `_memoizedFn` rather
     * than its `_fn` will cause the result to be stored in the `_cache`, keyed by
     * the function arguments.
     *
     * @method    memoize
     */
    memoize () {
        Object.defineProperty(this, `_cache`, {
            value: {},
            writable: false,
            configurable: true,
            enumerable: false
        });

        const memoized = function(fn, ...args) {
            const key = args && args.length ? args[0] : `none`;
            const cache = memoized.cache;

            if (cache[key]) {
                return cache[key];
            }

            const result = fn.apply(fn, args);
            cache[key] = result;

            return result;
        };

        memoized.cache = this._cache;
        this._memoizedFn = memoized;
    }

    /**
     * Remove the `_cache` property and `_memoizedFn`. Set `_memoize` to false
     * so that `_fn` is called.
     * @method    dememoize
     */
    dememoize () {
        delete this._cache;
        delete this._memoizedFn;
        this._memoize = false;
    }

    /**
     * Represent an Invokable as a string.
     * @method    serialize
     * @return    {String}                    a stringified JSON blob representing an
     *                                        `Invokable` and its arguments
     */
    serialize () {
        return JSON.stringify(this);
    }
}

export default Invokable;
