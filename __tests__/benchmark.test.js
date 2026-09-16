/* eslint-env node, jest */

const Benchmark = require('benchmark');
const utils = require('../example/externals/utils');
const helpers = require('./helpers');

const FenceBuilder = require('../src').default;
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

const baseUserPolicy = basePolicy.fork()
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
                    schema.validate(user);
                })
            )
            .on('cycle', event => cycles.push(String(event.target)))
            .on('complete', () => {
                const fastest = suite.filter('fastest').map('name');
                console.log(`policy: fastest is ${fastest}\n  ${cycles.join('\n  ')}`);
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
                console.log(`strict equal: fastest is ${fastest}\n  ${cycles.join('\n  ')}`);
            });

        suite.run({ async: false });
    });
});
