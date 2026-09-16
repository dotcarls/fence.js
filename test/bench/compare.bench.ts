/*
 * Compares fence.js against validate.js and Joi on the same policies.
 * Run with `npm run bench`. Numbers are informational; nothing asserts a ranking.
 */
import Joi from 'joi';
import { Bench } from 'tinybench';
import validate from 'validate.js';

import { FenceBuilder } from '../../src/index.js';
import * as v from '../support/validators.js';

const basePolicy = new FenceBuilder()
    .register(v.required, 'required')
    .register(v.isString, 'string')
    .register(v.isValidEmailAddress, 'email')
    .register(v.policy, 'policy')
    .register(v.minLength, 'min')
    .register(v.maxLength, 'max')
    .register(v.strictEqual, 'equal');

const baseUserPolicy = basePolicy.fork().required!().max!(255);
const userFence = basePolicy.fork().policy!({
    username: baseUserPolicy.fork().min!(4).email!().build(),
    password: baseUserPolicy.fork().min!(8).build(),
}).build();
const letterFence = basePolicy.fork().equal!('a').build();

const constraints = {
    username: { presence: true, length: { minimum: 4, maximum: 255 }, email: true },
    password: { presence: true, length: { minimum: 8, maximum: 255 } },
};
const schema = Joi.object().keys({
    username: Joi.string().email().min(4).max(255).required(),
    password: Joi.string().min(8).max(255).required(),
});
const letterSchema = Joi.string().valid('a');

const { users, chars } = v.createTestData(20);

async function suite(name: string, cases: Record<string, () => void>) {
    const bench = new Bench({ name, time: 500 });
    for (const [label, fn] of Object.entries(cases)) bench.add(label, fn);
    await bench.run();
    console.log(`\n${name}`);
    console.table(bench.table());
}

await suite('user policy (20 users)', {
    'fence.js': () => {
        for (const user of users) userFence.run(user).forAll();
    },
    'validate.js': () => {
        for (const user of users) validate(user, constraints);
    },
    joi: () => {
        for (const user of users) schema.validate(user);
    },
});

await suite('strict equality (20 chars)', {
    'fence.js': () => {
        for (const char of chars) letterFence.run(char.val).forAll();
    },
    'validate.js': () => {
        for (const char of chars) validate(char, { val: { equality: 'test' } });
    },
    joi: () => {
        for (const char of chars) letterSchema.validate(char.val);
    },
});
