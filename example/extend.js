const FenceBuilder = require('../cjs');

// Const's get this show on the road!
let FB = new FenceBuilder();

// Create a prototype method that will call a function which performs a strict
// comparison of two values. `val1` will be set to a constant value after the
// validation has been forkd.
FB = FB.register(function strictEqual(val1, val2) {
    return val1 === val2;
}, 'strictEqual');

// `fork()` creates a copy of a `FenceBuilder` that you can extend
let original = FB.fork();

// `FenceBuilder` methods return a reference to `this` to facilitate function
// chaining. if you do not want to chain functions, make sure to store the reference
original = original.strictEqual('a');

// Create a copy of the `original` validation then add an additional test for 'b'
let extended = original.fork().strictEqual('b');

// We can add additional methods to an extended validation via `.register()`
extended = extended.register(function() {
    return true;
}, 'alwaysTrue').alwaysTrue(); // Function chaining ftw!

// consts create a third order validation and test for 'c'
const moreExtended = extended.fork().strictEqual('c');

// The value we will be testing
const val = 'a';

// Once a validation is compconste, `.build()` will create an instance of `Fence`
// (*not* `FenceBuilder`) which would typically be exported for use by other
// code. here we are going to build them and run them all at once to see the output.
const validations = [
    original.build(),
    extended.build(),
    moreExtended.build()
].map(function(validation) {
    return validation.run(val);
});

// We'll now print the results returned from the validations of the value 'a'
validations.forEach(function(result) {
    console.log('\n');
    result.explain();
});
