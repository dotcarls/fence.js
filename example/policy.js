const FenceBuilder = require('../lib');
const vcutils = require('./externals/vcutils');

// Const's get this show on the road!
let FB = new FenceBuilder();

// A major benefit to the `FenceBuilder` approach is that by lazily executing
// function references, we can pull validation functions from different modules
FB = FB.register('hasValue', vcutils.hasValue);

// Function chaining allows for concise declarations and protects against mutation
FB = FB.register('isString', vcutils.isString)
       .register('isValidEmailAddress', vcutils.isValidEmailAddress);

// Function declarations can also be used. In this case we are defining a higher
// order validation that will receive an `entity` and a `policy` and return an
// object that represents the validity of said entity against said policy
FB = FB.register('policy', function(entity, policy) {
    const results = [];
    // This validation assumes that there is a 1:1 mapping between attributes and
    // validation functions. We will define the validation functions below
    for (const attribute in entity) {
        if (policy[attribute]) {
            results.push(policy[attribute].run(entity[attribute]));
        }
    }

    return results;
});

// All policies that extend from `basePolicy` should have a value
const basePolicy = FB.fork().hasValue();

// Beyond that, we may want to be more specific with our validation functions,
// so we register a `minLength` and a `maxLength` function
let usernamePolicy = basePolicy.fork();
usernamePolicy = usernamePolicy.register('minLength', function(val, length) {
    if (!vcutils.hasValue(val) || !vcutils.isString(val) || !vcutils.isInteger(length)) {
        return false;
    }

    return val.length >= length;
});

// You don't have to chain functions, just make sure to store a reference
usernamePolicy = usernamePolicy.register('maxLength', function(val, length) {
    if (!vcutils.hasValue(val) || !vcutils.isString(val) || !vcutils.isInteger(length)) {
        return false;
    }

    return val.length <= length;
});

// The data type for username columns in MySQL is constCHAR(255), so we'll use that
// for the maximum length validation.
usernamePolicy = usernamePolicy.maxLength(255);

// Passwords have the same data type, should also have a value, etc, so consts call
// `fork()` on `usernamePolicy` to pick those up.
let passwordPolicy = usernamePolicy.fork();

// Beyond `maxLength`, usernames and passwords have different requirements/
usernamePolicy = usernamePolicy.minLength(4).isValidEmailAddress();
passwordPolicy = passwordPolicy.minLength(8);

// We create a 1:1 mapping of attributes to policies. This allows us to create a
// higher order policy, or a 'Policy of Policies', that will use `.policy()`
const userPolicy = {
    username: usernamePolicy.build(),
    password: passwordPolicy.build()
};

// Our higher order policy validation
const userFence = FB.fork().policy(userPolicy).build();

// Will pass all policy checks
const goodUser = {
    username: 'tim.carlson@velocloud.net',
    password: 'somepassword'
};

// Will fail some policy checks
const badUser = {
    username: 'tim',
    password: 'password'
};

// A collection of users we will run `userFence` against
const users = [
    goodUser,
    badUser
];

console.log('User Fence');
users.forEach(function(user) {
    userFence.run(user).explain();
});
