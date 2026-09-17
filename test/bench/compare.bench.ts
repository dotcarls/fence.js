/*
 * Compares fence.js against validate.js and Joi on the same policies.
 * Run with `npm run bench`. Numbers are informational; nothing asserts a ranking.
 */
import Joi from 'joi';
import { Bench } from 'tinybench';
import validate from 'validate.js';

import { FenceBuilder } from '../../src/index.js';
import * as v from '../support/validators.js';

const base = FenceBuilder.create().registerAll({
    required: v.required,
    string: v.isString,
    email: v.isEmail,
    policy: v.policy,
    min: v.minLength,
    max: v.maxLength,
    equal: v.strictEqual,
});

const user = base.required().string().max(255);
const userFence = base
    .policy({
        username: user.min(4).email().build(),
        password: user.min(8).build(),
    })
    .build();
const letterFence = base.equal('a').build();

const constraints = {
    username: { presence: true, length: { minimum: 4, maximum: 255 }, email: true },
    password: { presence: true, length: { minimum: 8, maximum: 255 } },
};
const schema = Joi.object().keys({
    username: Joi.string().email().min(4).max(255).required(),
    password: Joi.string().min(8).max(255).required(),
});
const letterSchema = Joi.string().valid('a');

const users = Array.from({ length: 20 }, (_, i) => ({
    username: i % 2 ? `user${String(i)}@example.com` : `user${String(i)}`,
    password: i % 3 ? `password-${String(i)}` : 'short',
}));
const chars = Array.from({ length: 20 }, (_, i) => ({ val: 'abcd'[i % 4] ?? 'a', test: 'a' }));

let passes = 0;

async function suite(name: string, cases: Record<string, () => void>) {
    const bench = new Bench({ name, time: 500 });
    for (const [label, fn] of Object.entries(cases)) bench.add(label, fn);
    await bench.run();
    console.log(`\n${name}`);
    console.table(bench.table());
}

process.on('exit', () => {
    if (passes < 0) console.log('unreachable');
});

await suite('user policy (20 users)', {
    'fence.js': () => {
        for (const candidate of users) if (userFence.run(candidate).passed) passes++;
    },
    'validate.js': () => {
        for (const candidate of users) validate(candidate, constraints);
    },
    joi: () => {
        for (const candidate of users) schema.validate(candidate);
    },
});

await suite('strict equality (20 chars)', {
    'fence.js': () => {
        for (const char of chars) if (letterFence.run(char.val).passed) passes++;
    },
    'validate.js': () => {
        for (const char of chars) validate(char, { val: { equality: 'test' } });
    },
    joi: () => {
        for (const char of chars) letterSchema.validate(char.val);
    },
});
