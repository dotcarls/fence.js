import Invokable from './Invokable';
import Validation from './Validation';

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
* be used to make specific comparisons. *
*/
class ValidationBuilder {
    /**
    * @param    {Array}    invokables    A set of already defined `Invokable`'s
    */
    constructor (invokables) {
        this._invokables = invokables ? invokables.slice() : [];
    }

    /**
    * Create a clone of a `ValidationBuilder` instance so that it can be extended.
    *
    * @return    {ValidationBuilder}    a reference to a new `ValidationBuilder`
    */
    fork (proto) {
        // Stop any other references to this `ValidationBuilder` from registering
        // additional methods (or overwriting currently existing ones)
        proto = proto || Object.getPrototypeOf(this);

        // Create a reference to this instance's `_invokables`, use them to seed the
        // new instance's `_invokables`
        const invokables = this._invokables;

        // Create a new `ValidationBuilder` that inherits from this `ValidationBuilder`
        const VB = function() {
            ValidationBuilder.call(this, invokables);
        };

        // Set the prototype so that registered functions are available
        VB.prototype = Object.create(proto);
        VB.prototype.constructor = VB;

        // Instantiate the new `ValidationBuilder`
        return new VB();
    }

    /**
    * Add a named function reference to the prototype of an instance of `ValidationBuilder`
    *
    * @param     {String}              name    A named function reference
    * @param     {Function}            fn      A reference to a validation function

    * @return    {ValidationBuilder}           The `ValidationBuilder` instance being
    *                                          operated on, used for function chaining
    */
    register (name, fn, memoize, debug, loggers) {
        const proto = Object.getPrototypeOf(this);
        proto[name] = function() {
            this._invokables.push(new Invokable(name, fn, arguments, memoize, debug, loggers));

            return this;
        };

        return this.fork(proto);
    }

    /**
    * Remove a named function reference from the prototype of an instance of `ValidationBuilder`
    * @param     {String}              name    A named function reference

    * @return    {ValidationBuilder}           The `ValidationBuilder` instance being
    *                                          operated on, used for function chaining
    */
    unregister (name) {
        const proto = Object.getPrototypeOf(this);
        delete proto[name];

        const tmp = this.fork(proto);
        tmp._invokables = this._invokables.filter(function(invokable) {
            return invokable.getName() !== name;
        });

        return tmp;
    }

    /**
    * Convert an instance of `ValidationBuilder` to something that can be used to
    * validate some value
    *
    * @return    {Validation}      an Object with a `run()` method that can be called
    *                              with a value, will produce a list of `Results`
    */
    build () {
        return new Validation(this._invokables);
    }

    /**
    * Create a representation of an instance of `ValidationBuilder`'s Invokable
    * function reference names and arguments that can be persisted then later used
    * by `hydrate()` recreate an equivalent `ValidationBuilder`
    *
    * @return    {String}      a stringified JSON blob that can be persisted
    */
    serialize (returnFull) {
        return JSON.stringify(this._invokables.map(function(invokable) {
            return invokable.serialize(returnFull);
        }));
    }

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
    hydrate (invokables) {
        const tmp = this.fork();
        tmp._invokables = [];

        JSON.parse(invokables).map(JSON.parse).forEach(function(invokable) {
            const name = invokable._name;
            const args = invokable._args;
            const fn = Object.getPrototypeOf(tmp)[name];

            if (fn) {
                fn.apply(tmp, args);
            } else {
                throw new Error(`Method ${name} missing during validation builder hydration`);
            }
        });

        return tmp;
    }
}

export default ValidationBuilder;
