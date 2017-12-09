/**
* Adapter for mapping validation invokables to their results
*/
class Result {
    /**
    * @param    {Array}    invokables    Array of invokable validation functions
    * @param    {Array}    results       Array of values returned from invoked validation functions
    */
    constructor (invokables, results, subject) {
        this._invokables = invokables;
        this._results = results;
        this._subject = subject;
    }

    /**
    * A Results summary that will return `true` if all validations passed
    *
    * @return    {Boolean}    `true` if all Results are also `true`, `false` otherwise
    */
    forAll () {
        const results = this._results;

        return results.reduce(function(acc, result) {
            if (Array.isArray(result)) {
                return acc && result.reduce(function(subAcc, subResult) {
                    return subAcc && subResult.forAll();
                }, acc);
            }

            return acc && result === true;
        }, true);
    }

    /**
    * A Results summary that will return `true` if any validations passed
    * @return    {Boolean}    `true` if any one Result is also `true`, `false` if
    *                         all results are also `false`
    */
    forAny () {
        const results = this._results;

        return results.reduce(function (acc, result) {
            if (Array.isArray(result)) {
                return acc || result.reduce(function(subAcc, subResult) {
                    return subAcc || subResult.forAny();
                }, acc) === true;
            }

            return acc || result === true;
        }, false);
    }

    /**
    * Filters results by name
    * @param     {String}    name    The name for a specific Invokable. This value
    *                                is set by `ValidationBuilder.register`
    * @return    {Array}             An array of Booleans derived from specified
    *                                Invokables
    */
    forOne (name) {
        const invokables = this._invokables;
        const results = this._results;

        return results.filter(function(element, index) {
            return invokables[index].getName() === name;
        });
    }

    explain (logger, indent) {
        logger = logger || console.log;
        indent = indent || '  ';

        logger(indent, 'subject:', JSON.stringify(this._subject));
        logger(indent + indent, this.forAll() ? '[✓]' : '[x]', 'forAll');
        logger(indent + indent, this.forAny() ? '[✓]' : '[x]', 'forAny');

        logger(indent, 'tests:');
        for (var i = 0; i < this._results.length; i++) {
            const result = this._results[i];
            const invokable = this._invokables[i];
            const testName = invokable._name;
            const testArgs = invokable._args;

            let testLabel = testName;
            if (testArgs.length > 0) {
                testLabel += ' (' + JSON.stringify(testArgs) + ')';
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
