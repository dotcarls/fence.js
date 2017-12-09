import Result from './Result';

/**
 * A 'built' ValidationBuilder that can be exported for use in other functions.
 *
 * @param    {array}    invokables    Array of invokable functions
 */
function Validation (invokables) {
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
Validation.prototype.run = function(...subjects) {
    const invokables = this._invokables;
    const results = invokables.map(function(invokable) {
        return invokable.invoke.apply(invokable, subjects);
    });

    return new Result(invokables, results, subjects);
};

export default Validation;
