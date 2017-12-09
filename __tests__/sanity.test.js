const assert = require('assert');
const vcutils = require('../example/externals/vcutils');
const helpers = require('./helpers');

const ValidationBuilder = require('../src');
const validate = require('validate.js');
const Joi = require('joi');

const basePolicy = (new ValidationBuilder())
    .register('required', vcutils.hasValue)
    .register('string', vcutils.isString)
    .register('email', vcutils.isValidEmailAddress)
    .register('policy', helpers.policy)
    .register('min', helpers.minLength)
    .register('max', helpers.maxLength)
    .register('equal', helpers.strictEqual);

const baseUserPolicy = basePolicy.fork().required().max(255);
const userPolicy = {
    username: baseUserPolicy.fork().min(4).email().build(),
    password: baseUserPolicy.fork().min(8).build()
};

const userValidation = basePolicy.fork().policy(userPolicy).build();
const letterValidation = basePolicy.fork().equal('a').build();

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
    username: Joi.string().email().min(4).max(255).required(),
    password: Joi.string().min(8).max(255).required()
});

describe('ValidationBuilder', function () {
    const {users, chars} = helpers.createTestData(50);

    users.forEach(user => {
        it(`has the same result as validate.js [${user.username} / ${user.password}]`, function() {
            var chainResult = userValidation.run(user).forAll();
            var validateResult = validate(user, constraints);
            var desiredResult = chainResult ? typeof validateResult === 'undefined' : typeof validateResult === 'object';

            assert(desiredResult, `${user.username} / ${user.password} - ${chainResult} / ${validateResult} => ${desiredResult}`);
        });

        it(`has the same result as Joi [${user.username} / ${user.password}]`, function() {
            var chainResult = userValidation.run(user).forAll();
            var joiResult = Joi.validate(user, schema);
            var desiredResult = chainResult ? joiResult.error === null : joiResult.error !== null;

            assert(desiredResult, `${user.username} / ${user.password} - ${chainResult} / ${joiResult} => ${desiredResult}`);
        });
    });
    chars.forEach(char => {
        it(`has the same result as validate.js [${char.val} / ${char.test}]`, function() {
            var chainResult = letterValidation.run(char.val, char.test).forAll();
            var validateResult = validate(char, {val: {equality: 'test'}});
            var desiredResult = chainResult ? typeof validateResult === 'undefined' : typeof validateResult === 'object';
            var comparator = chainResult ? '===' : '!==';

            assert(desiredResult, `${char.val} ${comparator} ${char.test} - ${chainResult} / ${validateResult} => ${desiredResult}`);
        });

        it(`has the same result as Joi [${char.val} / ${char.test}]`, function() {
            var chainResult = letterValidation.run(char.val, char.test).forAll();
            var joiResult = Joi.string().valid(char.test).validate(char.val);
            var desiredResult = chainResult ? joiResult.error === null : joiResult.error !== null;
            var comparator = chainResult ? '===' : '!==';

            assert(desiredResult, `${char.val} ${comparator} ${char.test} - ${chainResult} / ${joiResult.error} => ${desiredResult}`);
        });
    });
});
