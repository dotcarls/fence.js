import Invokable from './Invokable';

/**
 * Adapter for mapping validation invokables to their results
 */
class Result {
    /**
     * @param    {Invokable[]}    invokables     Array of invokable validation functions
     * @param    {Result[]}          results     Array of values returned from invoked validation
     *                                           functions
     */
    constructor(invokables = [], results = [], subject = null) {
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
     * A Results summary that will return `true` if all validations passed
     *
     * @return    {Boolean}    `true` if all Results are also `true`, `false` otherwise
     */
    forAll() {
        return this._results.reduce(function(acc, result) {
            if (Array.isArray(result)) {
                return (
                    acc &&
                    result.reduce(function(subAcc, subResult) {
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
     * A Results summary that will return `true` if any validations passed
     * @return    {Boolean}    `true` if any one Result is also `true`, `false` if
     *                         all results are also `false`
     */
    forAny() {
        return this._results.reduce(function(acc, result) {
            if (Array.isArray(result)) {
                return (
                    acc ||
                    result.reduce(function(subAcc, subResult) {
                        if (!(subResult instanceof Result)) {
                            throw 'Result results array can only contain booleans or arrays of Results';
                        }

                        return subAcc || subResult.forAny();
                    }, acc) === true
                );
            }

            return acc || result === true;
        }, false);
    }

    /**
     * Filters results by name
     * @param     {String}    name    The name for a specific Invokable. This value
     *                                is set by `FenceBuilder.register`
     * @return    {Array}             An array of Booleans derived from specified
     *                                Invokables
     */
    forOne(name) {
        if (!(typeof name === 'string') || name.length <= 0) {
            throw 'Result forOne must have Invokable name as parameter';
        }

        return this._results.filter((element, index) => {
            if (!(this._invokables[index] instanceof Invokable)) {
                throw 'Result invokables array can only contain Invokables';
            }

            return this._invokables[index]._name === name;
        });
    }

    explain(logger, indent) {
        logger = logger || console.log;
        indent = indent || '  ';

        logger(indent, 'subject:', JSON.stringify(this._subject));
        logger(indent + indent, this.forAll() ? '[✓]' : '[x]', 'forAll');
        logger(indent + indent, this.forAny() ? '[✓]' : '[x]', 'forAny');

        logger(indent, 'tests:');
        for (let i = 0; i < this._results.length; i++) {
            const result = this._results[i];
            const invokable = this._invokables[i];
            const testName = invokable._name;
            const testArgs = invokable._args;

            let testLabel = testName;
            if (testArgs.length > 0) {
                testLabel += ` (${JSON.stringify(testArgs)})`;
            }

            logger(indent + indent, result ? '[✓]' : '[x]', testLabel);

            if (Array.isArray(result)) {
                result.forEach(function(subResult) {
                    subResult.explain(logger, indent + indent);
                });

                continue;
            }
        }
    }
}

export default Result;
