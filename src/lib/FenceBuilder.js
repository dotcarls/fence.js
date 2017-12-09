import Invokable from './Invokable';
import Fence from './Fence';

/**
* A `FenceBuilder` is used to create an extensible `Fence`.
*
* An instance of `FenceBuilder` will have prototype methods that are created
* through the `register()` method. When the `fork()` method is called all of the
* instance's already registered methods will be transferred to a new instance of
* `FenceBuilder` that is then returned. This is what allows you to 'extend'
* a `Fence` as you can then continue to `register()` methods without mutating
* the original `FenceBuilder`'s prototype.
*
* These prototypical methods are called `Invokable`'s. An `Invokable` is a named
* function reference that optionally includes some predefined arguments that can
* be used to make specific comparisons. *
*/
class FenceBuilder {
    /**
    * @param    {Array}    invokables    A set of already defined `Invokable`'s
    */
    constructor (invokables) {
        this._invokables = invokables ? invokables.slice() : [];
    }

    /**
    * Create a clone of a `FenceBuilder` instance so that it can be extended.
    *
    * @return    {FenceBuilder}    a reference to a new `FenceBuilder`
    */
    fork (proto) {
        // Stop any other references to this `FenceBuilder` from registering
        // additional methods (or overwriting currently existing ones)
        proto = proto || Object.getPrototypeOf(this);

        // Create a reference to this instance's `_invokables`, use them to seed the
        // new instance's `_invokables`
        const invokables = this._invokables;

        // Create a new `FenceBuilder` that inherits from this `FenceBuilder`
        const FB = function() {
            FenceBuilder.call(this, invokables);
        };

        // Set the prototype so that registered functions are available
        FB.prototype = Object.create(proto);
        FB.prototype.constructor = FB;

        // Instantiate the new `FenceBuilder`
        return new FB();
    }

    /**
    * Add a named function reference to the prototype of an instance of `FenceBuilder`
    *
    * @param     {String}              name    A named function reference
    * @param     {Function}            fn      A reference to a validation function

    * @return    {FenceBuilder}           The `FenceBuilder` instance being
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
    * Remove a named function reference from the prototype of an instance of `FenceBuilder`
    * @param     {String}              name    A named function reference

    * @return    {FenceBuilder}           The `FenceBuilder` instance being
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
    * Convert an instance of `FenceBuilder` to something that can be used to
    * validate some value
    *
    * @return    {Fence}      an Object with a `run()` method that can be called
    *                              with a value, will produce a list of `Results`
    */
    build () {
        return new Fence(this._invokables);
    }

    /**
    * Create a representation of an instance of `FenceBuilder`'s Invokable
    * function reference names and arguments that can be persisted then later used
    * by `hydrate()` recreate an equivalent `FenceBuilder`
    *
    * @return    {String}      a stringified JSON blob that can be persisted
    */
    serialize (returnFull) {
        return JSON.stringify(this._invokables.map(function(invokable) {
            return invokable.serialize(returnFull);
        }));
    }

    /**
    * Given a string representing a `serialize`'d `FenceBuilder`, attempt to
    * recreate a list of `Invokables` by calling the named prototype references. If
    * the `serialize`'d `FenceBuilder` includes a reference to an unavailable
    * prototype method, an error is thrown.
    *
    * @param     {String}    invokables    A `stringify`'d JSON blob representing a
    *                                      `FenceBuilder`'s `Invokeable`'s
    * @return    {FenceBuilder}
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

export default FenceBuilder;
