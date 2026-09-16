/*
 * Differential tests: fence.js must agree with validate.js and Joi on the same policies for
 * generated users. Strings are non-empty because validate.js treats "" as absent while Joi
 * and our validators do not; that difference is theirs, not ours.
 */
import fc from 'fast-check';
import Joi from 'joi';
import validate from 'validate.js';
import { describe, expect, test } from 'vitest';

import { FenceBuilder } from '../src/index.js';
import * as v from './support/validators.js';

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

const word = (max: number) => fc.stringMatching(new RegExp(`^[a-z0-9]{1,${String(max)}}$`));
const email = fc
    .tuple(word(10), word(8), fc.constantFrom('com', 'org', 'io'))
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);
const userArb = fc.record({
    username: fc.oneof(email, word(12)),
    password: fc.oneof(word(6), word(20)),
});

describe('fence.js agrees with validate.js and Joi', () => {
    test('user policy', () => {
        fc.assert(
            fc.property(userArb, (candidate) => {
                const ours = userFence.run(candidate).passed;
                expect(validate(candidate, constraints) === undefined).toBe(ours);
                expect(schema.validate(candidate).error === undefined).toBe(ours);
            }),
            { numRuns: 200 },
        );
    });

    test('strict equality', () => {
        fc.assert(
            fc.property(fc.constantFrom('a', 'b', 'c', 'd'), (letter) => {
                const ours = letterFence.run(letter).passed;
                expect(
                    validate({ val: letter, test: 'a' }, { val: { equality: 'test' } }) ===
                        undefined,
                ).toBe(ours);
                expect(Joi.string().valid('a').validate(letter).error === undefined).toBe(ours);
            }),
        );
    });

    test('an empty entity fails the policy (v1 vacuously passed it)', () => {
        expect(userFence.run({}).passed).toBe(false);
        expect(
            userFence
                .run({})
                .failures()
                .map((f) => f.path.join('.')),
        ).toEqual([
            'policy.username.required',
            'policy.username.string',
            'policy.username.max',
            'policy.username.min',
            'policy.username.email',
            'policy.password.required',
            'policy.password.string',
            'policy.password.max',
            'policy.password.min',
        ]);
    });
});
