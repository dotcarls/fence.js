/*
 * Differential tests: fence.js must agree with validate.js and Joi on the same policies for
 * generated users. Generated strings are non-empty because validate.js treats "" as absent
 * while Joi and our validators do not; that difference is theirs, not ours. Emails stay short
 * because Joi enforces RFC length limits on the local part that the other two do not.
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

const word = (min: number, max: number) =>
    fc.string({
        unit: fc.stringMatching(/^[a-z0-9]$/),
        minLength: min,
        maxLength: max,
    });
const email = fc
    .tuple(word(1, 10), word(1, 8), fc.constantFrom('com', 'org', 'io'))
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);
const maybe = <T>(arb: fc.Arbitrary<T>) => fc.option(arb, { nil: undefined, freq: 8 });
const userArb = fc.record(
    {
        username: maybe(fc.oneof(email, word(1, 12), word(250, 260))),
        password: maybe(fc.oneof(word(1, 7), word(8, 20), word(250, 260))),
    },
    { requiredKeys: [] },
);

describe('fence.js agrees with validate.js and Joi', () => {
    test('user policy, across presence, type, length and email failures', () => {
        const verdicts = { passed: 0, failed: 0 };
        fc.assert(
            fc.property(userArb, (candidate) => {
                const ours = userFence.run(candidate).passed;
                verdicts[ours ? 'passed' : 'failed']++;
                expect(validate(candidate, constraints) === undefined).toBe(ours);
                expect(schema.validate(candidate).error === undefined).toBe(ours);
            }),
            { numRuns: 300 },
        );
        expect(verdicts.passed).toBeGreaterThan(0);
        expect(verdicts.failed).toBeGreaterThan(0);
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

    test('the support policy validator reports every attribute of the shape, so an empty entity fails', () => {
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
        // A policy that iterated the entity instead would let {} through; that is the
        // validator's choice, not the library's.
        expect(base.policy({}).build().run({}).passed).toBe(true);
    });
});
