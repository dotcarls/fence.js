/**
* A validation function that will be invoked at some time
*
* @param    {String}       name    [required] Function Name used for prototype / lookups
* @param    {Function}     fn      [required] Function reference that is executed during invokation
* @param    {Array}        args    [optional] arguments to be applied to the function
*/
function Invokable (name, fn, args, memoize) {
    this._name = name;
    this._fn = fn;
    this._args = args ? Array.prototype.slice.call(args) : [];
    this._memoize = memoize === true;

    if (this._memoize) {
        this.memoize();
    }
}

/**
* Executes a validation function against a subject and any predefined arguments
*
* @param     {Any}         subject    the value to be validated
* @return    {Boolean}                the result of the validation
*/
Invokable.prototype.invoke = function(...subjects) {
    let fn = this._fn;
    let args = subjects.concat(this._args);

    if (this._memoize && this._memoizedFn) {
        fn = this._memoizedFn;
        args = [this._fn].concat(args);
    }

    return fn.apply(this, args);
};

Invokable.prototype.memoize = function() {
    Object.defineProperty(this, '_cache', {
        value: {},
        writable: false,
        configurable: true,
        enumerable: false
    });

    const memoized = function(fn, ...args) {
        const key = args[0];
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
};

Invokable.prototype.dememoize = function() {
    delete this._cache;
    delete this._memoizedFn;
    this._memoize = false;
};

Invokable.prototype.serialize = function(returnFull) {
    if (returnFull === true) {
        return JSON.stringify(this);
    }

    const obj = {
        _name: this._name,
        _args: this._args,
        _memoize: this._memoize
    };
    return JSON.stringify(obj);
};

export default Invokable;
