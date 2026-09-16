/* eslint-env node, jest */

const utils = require('../example/externals/utils');
const { faker } = require('@faker-js/faker');

function minLength(val, length) {
    if (!utils.required(val) || !utils.isString(val) || !utils.isInteger(length)) {
        return false;
    }

    return val.length >= length;
}

function maxLength(val, length) {
    if (!utils.required(val) || !utils.isString(val) || !utils.isInteger(length)) {
        return false;
    }

    return val.length <= length;
}

function policy(entity, policy) {
    const results = [];
    for (const attribute in entity) {
        if (policy[attribute]) {
            results.push(policy[attribute].run(entity[attribute]));
        }
    }

    return results;
}

function strictEqual(val1, val2) {
    return val1 === val2;
}

function createTestData(num = 1) {
    const users = [];
    const chars = [];
    for (let i = 0; i < num; i++) {
        users.push({
            username:
                Math.floor(Math.random() * 100) % 2 === 0
                    ? faker.internet.email()
                    : faker.internet.username(),
            password:
                Math.floor(Math.random() * 100) % 2 === 0
                    ? faker.internet.password()
                    : faker.word.sample()
        });

        chars.push({
            val: faker.helpers.arrayElement(['a', 'b', 'c', 'd']),
            test: 'a'
        });
    }

    return {
        users,
        chars
    };
}

module.exports = {
    minLength,
    maxLength,
    policy,
    strictEqual,
    createTestData
};
