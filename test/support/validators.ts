/*
 * Validators used by the end-to-end tests and benchmarks. fence.js ships no
 * validators of its own; these stand in for an application's utility module.
 */
import { faker } from '@faker-js/faker';

import type { Fence } from '../../src/index.js';

export function required(value: unknown): boolean {
    return value !== undefined && value !== null;
}

export function isString(value: unknown): boolean {
    return typeof value === 'string';
}

export function isInteger(value: unknown): boolean {
    if ((typeof value !== 'number' && typeof value !== 'string') || Number.isNaN(Number(value))) {
        return false;
    }
    const x = Number.parseFloat(String(value));
    return Number.isInteger(x);
}

const EMAIL =
    /^([\w-.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;

export function isValidEmailAddress(email: unknown): boolean {
    return typeof email === 'string' && EMAIL.test(email);
}

export function minLength(val: unknown, length: unknown): boolean {
    if (!required(val) || !isString(val) || !isInteger(length)) {
        return false;
    }
    return (val as string).length >= (length as number);
}

export function maxLength(val: unknown, length: unknown): boolean {
    if (!required(val) || !isString(val) || !isInteger(length)) {
        return false;
    }
    return (val as string).length <= (length as number);
}

export function strictEqual(val1: unknown, val2: unknown): boolean {
    return val1 === val2;
}

/** Higher-order validator: runs one fence per attribute of the entity. */
export function policy(entity: Record<string, unknown>, shape: Record<string, Fence>) {
    const results = [];
    for (const attribute in entity) {
        const fence = shape[attribute];
        if (fence) {
            results.push(fence.run(entity[attribute]));
        }
    }
    return results;
}

export interface TestUser {
    username: string;
    password: string;
}

export function createTestData(num = 1) {
    const users: TestUser[] = [];
    const chars: { val: string; test: string }[] = [];

    for (let i = 0; i < num; i++) {
        users.push({
            username: faker.datatype.boolean() ? faker.internet.email() : faker.internet.username(),
            password: faker.datatype.boolean() ? faker.internet.password() : faker.word.sample(),
        });

        chars.push({
            val: faker.helpers.arrayElement(['a', 'b', 'c', 'd']),
            test: 'a',
        });
    }

    return { users, chars };
}
