// Higher-order validation: a fence whose step runs other fences, one per attribute.
import { FenceBuilder } from 'fence.js';

import { isEmail, isString, max, min, policy, required } from './validators.js';

const base = FenceBuilder.create().registerAll({ required, isString, isEmail, min, max, policy });

// Shared prefix, then two derivations. No fork() needed: builders are values.
const text = base.required().isString().max(255);
const user = base
    .policy({
        username: text.min(4).isEmail().build(),
        password: text.min(8).build(),
    })
    .build();

const good = { username: 'tim@example.com', password: 'correct horse battery' };
const bad = { username: 'tim', password: 'short' };

console.log(user.run(good).passed); // true
console.log(
    user
        .run(bad)
        .failures()
        .map((f) => f.path.join('.')),
);
// [ 'policy.username.min', 'policy.username.isEmail', 'policy.password.min' ]

console.log(user.run(bad).explain());
