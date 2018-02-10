/* eslint-env node, jest */

const assert = require('assert');
const Benchmark = require('benchmark');
const utils = require('../example/externals/utils');
const helpers = require('./helpers');

const FenceBuilder = require('../src');
const validate = require('validate.js');
const Joi = require('joi');

const basePolicy = new FenceBuilder()
    .register('required', utils.hasValue)
    .register('string', utils.isString)
    .register('email', utils.isValidEmailAddress)
    .register('policy', helpers.policy)
    .register('min', helpers.minLength)
    .register('max', helpers.maxLength)
    .register('equal', helpers.strictEqual);

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

describe('compare benchmarks', () => {
    const { users, chars } = helpers.createTestData();

    it('is faster to use fence.js for policy', () => {
        const cycles = [];
        const suite = new Benchmark.Suite()
            .add('fence.js Policy', () =>
                users.forEach(user => {
                    userFence.run(user).forAll();
                })
            )
            .add('Validate Policy', () =>
                users.forEach(user => {
                    validate(user, constraints);
                })
            )
            .add('Joi Policy', () =>
                users.forEach(user => {
                    Joi.validate(user, schema);
                })
            )
            .on('cycle', event => cycles.push(String(event.target)))
            .on('complete', () => {
                const fastest = suite.filter('fastest').map('name');
                assert(
                    fastest[0] === 'fence.js Policy',
                    `Fastest is ${fastest}, cycles: ${cycles}`
                );
            });

        suite.run({ async: false });
    });

    it('is faster to use fence.js for strict equal', () => {
        const cycles = [];
        const suite = new Benchmark.Suite()
            .add('fence.js Strict Equal', () =>
                chars.forEach(char => {
                    letterFence.run(char.val).forAll();
                })
            )
            .add('Validate Strict Equal', () =>
                chars.forEach(char => {
                    validate(char, { val: { equality: 'test' } });
                })
            )
            .add('Joi Strict Equal', () =>
                chars.forEach(char => {
                    Joi.string()
                        .valid(char.test)
                        .validate(char.val);
                })
            )
            .on('cycle', event => cycles.push(String(event.target)))
            .on('complete', () => {
                const fastest = suite.filter('fastest').map('name');
                assert(
                    fastest[0] === 'fence.js Strict Equal',
                    `Fastest is ${fastest}, cycles: ${cycles}`
                );
            });

        suite.run({ async: false });
    });
});
