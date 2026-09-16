/*
 * Differential tests: fence.js must agree with validate.js and Joi on the same
 * policies. Test data is random on purpose (see createTestData).
 */
import Joi from 'joi';
import validate from 'validate.js';
import { describe, expect, test } from 'vitest';

import { FenceBuilder } from '../src/index.js';
import * as v from './support/validators.js';

const basePolicy = new FenceBuilder()
    .register(v.required, 'required')
    .register(v.isString, 'string')
    .register(v.isValidEmailAddress, 'email')
    .register(v.policy, 'policy')
    .register(v.minLength, 'min')
    .register(v.maxLength, 'max')
    .register(v.strictEqual, 'equal');

const baseUserPolicy = basePolicy.fork().required!().max!(255);

const userPolicy = {
    username: baseUserPolicy.fork().min!(4).email!().build(),
    password: baseUserPolicy.fork().min!(8).build(),
};

const userFence = basePolicy.fork().policy!(userPolicy).build();
const letterFence = basePolicy.fork().equal!('a').build();

const constraints = {
    username: { presence: true, length: { minimum: 4, maximum: 255 }, email: true },
    password: { presence: true, length: { minimum: 8, maximum: 255 } },
};

const schema = Joi.object().keys({
    username: Joi.string().email().min(4).max(255).required(),
    password: Joi.string().min(8).max(255).required(),
});

describe('fence.js agrees with validate.js and Joi', () => {
    const { users, chars } = v.createTestData(25);

    test.each(users)('user policy %o', (user) => {
        const ours = userFence.run(user).forAll();
        expect(validate(user, constraints) === undefined).toBe(ours);
        expect(schema.validate(user).error === undefined).toBe(ours);
    });

    test.each(chars)('strict equality %o', (char) => {
        const ours = letterFence.run(char.val, char.test).forAll();
        expect(validate(char, { val: { equality: 'test' } }) === undefined).toBe(ours);
        expect(Joi.string().valid(char.test).validate(char.val).error === undefined).toBe(ours);
    });
});
