const FenceBuilder = require('../cjs');

// Const's get this show on the road!
let FB = new FenceBuilder();

FB = FB.register(function (val1, val2) {
    return val1 === val2;
}, 'strictEqual');

const original = FB.fork().strictEqual('a');
const extended = original.fork().register(function () {
    return true;
}, 'alwaysTrue').strictEqual('b').alwaysTrue();

const moreExtended = extended.fork().strictEqual('c');
const validations = [
    original,
    extended,
    moreExtended
];

// We'll now print the results returned from the validations of the value 'a'
validations.forEach(function(result) {
    const serialized = result.serialize();

    console.log('serialized validation:', serialized);

    console.log('hydrating, building, running, explaining:');
    result.hydrate(serialized).build().run('a').explain();
});
