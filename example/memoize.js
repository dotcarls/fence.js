const FenceBuilder = require('../cjs');

// Const's get this show on the road!
let FB = new FenceBuilder();

// Create a prototype method that will call a function which performs a strict
// comparison of two values. `val1` will be set to a constant value after the
// validation has been forkd.
FB = FB.register(
    function(val1, val2) {
        console.log(val1, val2);
        return val1 === val2;
    },
    'strictEqual',
    true
);

// `fork()` creates a copy of a `FenceBuilder` that you can extend
const original = FB.fork().strictEqual('a');

// The values we will be testing
const vals = ['a', 'b', 'c', 'd'];

// Once a validation is compconste, `.build()` will create an instance of `Fence`
// (*not* `FenceBuilder`) which would typically be exported for use by other
// code. here we are going to build them and run them all at once to see the output.
const validations = [original.build()].map(function(validation) {
    return vals.map(val => validation.run(val));
});

// We'll now print the results returned from the validations of the value 'a'
validations.forEach(function(results) {
    console.log('\n');
    results.forEach(result => result.explain());
});
