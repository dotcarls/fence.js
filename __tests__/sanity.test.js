/* eslint-env node, jest */

const assert = require('assert');
const utils = require('../example/externals/utils');
const helpers = require('./helpers');

const FenceBuilder = require('../src');
const validate = require('validate.js');
const Joi = require('joi');

const basePolicy = new FenceBuilder()
    .register(utils.required, 'required')
    .register(utils.isString, 'string')
    .register(utils.isValidEmailAddress, 'email')
    .register(helpers.policy, 'policy')
    .register(helpers.minLength, 'min')
    .register(helpers.maxLength, 'max')
    .register(helpers.strictEqual, 'equal');

const baseUserPolicy = basePolicy
    .fork()
    .required()
    .max(255);

const userPolicy = {
    username: baseUserPolicy
        .fork()
        .min(4)
        .email()
        .build(),
    password: baseUserPolicy
        .fork()
        .min(8)
        .build()
};

const userFence = basePolicy
    .fork()
    .policy(userPolicy)
    .build();

const letterFence = basePolicy
    .fork()
    .equal('a')
    .build();

const constraints = {
    username: {
        presence: true,
        length: {
            minimum: 4,
            maximum: 255
        },
        email: true
    },
    password: {
        presence: true,
        length: {
            minimum: 8,
            maximum: 255
        }
    }
};

const schema = Joi.object().keys({
    username: Joi.string()
        .email()
        .min(4)
        .max(255)
        .required(),
    password: Joi.string()
        .min(8)
        .max(255)
        .required()
});

describe('FenceBuilder', () => {
    const { users, chars } = helpers.createTestData(5);

    users.forEach(user => {
        it(`has the same result as validate.js [${user.username} / ${user.password}]`, () => {
            const chainResult = userFence.run(user).forAll();
            const validateResult = validate(user, constraints);
            const desiredResult = chainResult
                ? typeof validateResult === 'undefined'
                : typeof validateResult === 'object';

            assert(
                desiredResult,
                `${user.username} / ${
                    user.password
                } - ${chainResult} / ${validateResult} => ${desiredResult}`
            );
        });

        it(`has the same result as Joi [${user.username} / ${user.password}]`, () => {
            const chainResult = userFence.run(user).forAll();
            const joiResult = Joi.validate(user, schema);
            const desiredResult = chainResult ? joiResult.error === null : joiResult.error !== null;

            assert(
                desiredResult,
                `${user.username} / ${
                    user.password
                } - ${chainResult} / ${joiResult} => ${desiredResult}`
            );
        });
    });
    chars.forEach(char => {
        it(`has the same result as validate.js [${char.val} / ${char.test}]`, () => {
            const chainResult = letterFence.run(char.val, char.test).forAll();
            const validateResult = validate(char, { val: { equality: 'test' } });
            const desiredResult = chainResult
                ? typeof validateResult === 'undefined'
                : typeof validateResult === 'object';
            const comparator = chainResult ? '===' : '!==';

            assert(
                desiredResult,
                `${char.val} ${comparator} ${
                    char.test
                } - ${chainResult} / ${validateResult} => ${desiredResult}`
            );
        });

        it(`has the same result as Joi [${char.val} / ${char.test}]`, () => {
            const chainResult = letterFence.run(char.val, char.test).forAll();
            const joiResult = Joi.string()
                .valid(char.test)
                .validate(char.val);
            const desiredResult = chainResult ? joiResult.error === null : joiResult.error !== null;
            const comparator = chainResult ? '===' : '!==';

            assert(
                desiredResult,
                `${char.val} ${comparator} ${char.test} - ${chainResult} / ${
                    joiResult.error
                } => ${desiredResult}`
            );
        });
    });
});
