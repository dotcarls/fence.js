(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.fence = factory());
}(this, (function () { 'use strict';

/**
* A validation function that will be invoked at some time
*
* @param    {String}       name    [required] Function Name used for prototype / lookups
* @param    {Function}     fn      [required] Function reference that is executed during invokation
* @param    {Array}        args    [optional] arguments to be applied to the function
*/
function Invokable(name, fn, args, memoize) {
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
Invokable.prototype.invoke = function () {
    var fn = this._fn;

    for (var _len = arguments.length, subjects = Array(_len), _key = 0; _key < _len; _key++) {
        subjects[_key] = arguments[_key];
    }

    var args = subjects.concat(this._args);

    if (this._memoize && this._memoizedFn) {
        fn = this._memoizedFn;
        args = [this._fn].concat(args);
    }

    return fn.apply(this, args);
};

Invokable.prototype.memoize = function () {
    Object.defineProperty(this, '_cache', {
        value: {},
        writable: false,
        configurable: true,
        enumerable: false
    });

    var memoized = function memoized(fn) {
        for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
        }

        var key = args[0];
        var cache = memoized.cache;

        if (cache[key]) {
            return cache[key];
        }

        var result = fn.apply(fn, args);
        cache[key] = result;

        return result;
    };

    memoized.cache = this._cache;
    this._memoizedFn = memoized;
};

Invokable.prototype.dememoize = function () {
    delete this._cache;
    delete this._memoizedFn;
    this._memoize = false;
};

Invokable.prototype.serialize = function (returnFull) {
    if (returnFull === true) {
        return JSON.stringify(this);
    }

    var obj = {
        _name: this._name,
        _args: this._args,
        _memoize: this._memoize
    };
    return JSON.stringify(obj);
};

/**
 * Adapter for mapping validation invokables to their results
 *
 * @param    {Array}    invokables    Array of invokable validation functions
 * @param    {Array}    results       Array of values returned from invoked validation functions
 */
function Result(invokables, results, subject) {
    this._invokables = invokables;
    this._results = results;
    this._subject = subject;
}

/**
 * A Results summary that will return `true` if all validations passed
 *
 * @return    {Boolean}    `true` if all Results are also `true`, `false` otherwise
 */
Result.prototype.forAll = function () {
    var results = this._results;

    return results.reduce(function (acc, result) {
        if (Array.isArray(result)) {
            return acc && result.reduce(function (subAcc, subResult) {
                return subAcc && subResult.forAll();
            }, acc);
        }

        return acc && result === true;
    }, true);
};

/**
 * A Results summary that will return `true` if any validations passed
 * @return    {Boolean}    `true` if any one Result is also `true`, `false` if
 *                         all results are also `false`
 */
Result.prototype.forAny = function () {
    var results = this._results;

    return results.reduce(function (acc, result) {
        if (Array.isArray(result)) {
            return acc || result.reduce(function (subAcc, subResult) {
                return subAcc || subResult.forAny();
            }, acc) === true;
        }

        return acc || result === true;
    }, false);
};

/**
 * Filters results by name
 * @param     {String}    name    The name for a specific Invokable. This value
 *                                is set by `ValidationBuilder.register`
 * @return    {Array}             An array of Booleans derived from specified
 *                                Invokables
 */
Result.prototype.forOne = function (name) {
    var invokables = this._invokables;
    var results = this._results;

    return results.filter(function (element, index) {
        return invokables[index].getName() === name;
    });
};

Result.prototype.explain = function (logger, indent) {
    logger = logger || console.log;
    indent = indent || '  ';

    logger(indent, 'subject:', JSON.stringify(this._subject));
    logger(indent + indent, this.forAll() ? '[✓]' : '[x]', 'forAll');
    logger(indent + indent, this.forAny() ? '[✓]' : '[x]', 'forAny');

    logger(indent, 'tests:');
    for (var i = 0; i < this._results.length; i++) {
        var result = this._results[i];
        var invokable = this._invokables[i];
        var testName = invokable._name;
        var testArgs = invokable._args;

        var testLabel = testName;
        if (testArgs.length > 0) {
            testLabel += ' (' + JSON.stringify(testArgs) + ')';
        }

        logger(indent + indent, result ? '[✓]' : '[x]', testLabel);

        if (Array.isArray(result)) {
            result.forEach(function (subResult) {
                subResult.explain(logger, indent + indent);
            });

            continue;
        }
    }
};

/**
 * A 'built' ValidationBuilder that can be exported for use in other functions.
 *
 * @param    {array}    invokables    Array of invokable functions
 */
function Validation(invokables) {
    this._invokables = invokables;
}

/**
 * Iterates over an array of invokables. Each invokable is called with a subject
 * which is the attribute value being validated.
 *
 * @param     {any}         subject     Some value to be validated
 * @return    {Result}                  An object representing invoked functions
 *                                      and their outputs
 */
Validation.prototype.run = function () {
    for (var _len = arguments.length, subjects = Array(_len), _key = 0; _key < _len; _key++) {
        subjects[_key] = arguments[_key];
    }

    var invokables = this._invokables;
    var results = invokables.map(function (invokable) {
        return invokable.invoke.apply(invokable, subjects);
    });

    return new Result(invokables, results, subjects);
};

/**
 * A `ValidationBuilder` is used to create an extensible `Validation`.
 *
 * An instance of `ValidationBuilder` will have prototype methods that are created
 * through the `register()` method. When the `fork()` method is called all of the
 * instance's already registered methods will be transferred to a new instance of
 * `ValidationBuilder` that is then returned. This is what allows you to 'extend'
 * a `Validation` as you can then continue to `register()` methods without mutating
 * the original `ValidationBuilder`'s prototype.
 *
 * These prototypical methods are called `Invokable`'s. An `Invokable` is a named
 * function reference that optionally includes some predefined arguments that can
 * be used to make specific comparisons.
 *
 * @param    {Array}    invokables    A set of already defined `Invokable`'s
 */
function ValidationBuilder$1(invokables) {
    this._invokables = invokables ? invokables.slice() : [];
}

/**
 * Create a clone of a `ValidationBuilder` instance so that it can be extended.
 *
 * @return    {ValidationBuilder}    a reference to a new `ValidationBuilder`
 */
ValidationBuilder$1.prototype.fork = function (proto) {
    // Stop any other references to this `ValidationBuilder` from registering
    // additional methods (or overwriting currently existing ones)
    proto = proto || Object.getPrototypeOf(this);

    // Create a reference to this instance's `_invokables`, use them to seed the
    // new instance's `_invokables`
    var invokables = this._invokables;

    // Create a new `ValidationBuilder` that inherits from this `ValidationBuilder`
    var VB = function VB() {
        ValidationBuilder$1.call(this, invokables);
    };

    // Set the prototype so that registered functions are available
    VB.prototype = Object.create(proto);
    VB.prototype.constructor = VB;

    // Instantiate the new `ValidationBuilder`
    return new VB();
};

/**
 * Add a named function reference to the prototype of an instance of `ValidationBuilder`
 *
 * @param     {String}              name    A named function reference
 * @param     {Function}            fn      A reference to a validation function

 * @return    {ValidationBuilder}           The `ValidationBuilder` instance being
 *                                          operated on, used for function chaining
 */
ValidationBuilder$1.prototype.register = function (name, fn, memoize, debug, loggers) {
    var proto = Object.getPrototypeOf(this);
    proto[name] = function () {
        this._invokables.push(new Invokable(name, fn, arguments, memoize, debug, loggers));

        return this;
    };

    return this.fork(proto);
};

/**
 * Remove a named function reference from the prototype of an instance of `ValidationBuilder`
 * @param     {String}              name    A named function reference

 * @return    {ValidationBuilder}           The `ValidationBuilder` instance being
 *                                          operated on, used for function chaining
 */
ValidationBuilder$1.prototype.unregister = function (name) {
    var proto = Object.getPrototypeOf(this);
    delete proto[name];

    var tmp = this.fork(proto);
    tmp._invokables = this._invokables.filter(function (invokable) {
        return invokable.getName() !== name;
    });

    return tmp;
};

/**
 * Convert an instance of `ValidationBuilder` to something that can be used to
 * validate some value
 *
 * @return    {Validation}      an Object with a `run()` method that can be called
 *                              with a value, will produce a list of `Results`
 */
ValidationBuilder$1.prototype.build = function () {
    return new Validation(this._invokables);
};

/**
 * Create a representation of an instance of `ValidationBuilder`'s Invokable
 * function reference names and arguments that can be persisted then later used
 * by `hydrate()` recreate an equivalent `ValidationBuilder`
 *
 * @return    {String}      a stringified JSON blob that can be persisted
 */
ValidationBuilder$1.prototype.serialize = function (returnFull) {
    return JSON.stringify(this._invokables.map(function (invokable) {
        return invokable.serialize(returnFull);
    }));
};

/**
 * Given a string representing a `serialize`'d `ValidationBuilder`, attempt to
 * recreate a list of `Invokables` by calling the named prototype references. If
 * the `serialize`'d `ValidationBuilder` includes a reference to an unavailable
 * prototype method, an error is thrown.
 *
 * @param     {String}    invokables    A `stringify`'d JSON blob representing a
 *                                      `ValidationBuilder`'s `Invokeable`'s
 * @return    {ValidationBuilder}
 */
ValidationBuilder$1.prototype.hydrate = function (invokables) {
    var tmp = this.fork();
    tmp._invokables = [];

    JSON.parse(invokables).map(JSON.parse).forEach(function (invokable) {
        var name = invokable._name;
        var args = invokable._args;
        var fn = Object.getPrototypeOf(tmp)[name];

        if (fn) {
            fn.apply(tmp, args);
        } else {
            throw new Error('Method ' + name + ' missing during validation builder hydration');
        }
    });

    return tmp;
};

return ValidationBuilder$1;

})));
