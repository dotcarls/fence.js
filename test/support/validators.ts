/*
 * Validators used by the tests, examples and benchmarks. fence.js ships no validators of
 * its own; these stand in for an application's utility module.
 */
import type { Fence, Result } from '../../src/index.js';

export const required = (value: unknown): boolean => value !== undefined && value !== null;

export const isString = (value: unknown): value is string => typeof value === 'string';

const EMAIL =
    /^([\w-.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;

export const isEmail = (value: unknown): boolean => typeof value === 'string' && EMAIL.test(value);

export const minLength = (value: unknown, length: number): boolean =>
    typeof value === 'string' && value.length >= length;

export const maxLength = (value: unknown, length: number): boolean =>
    typeof value === 'string' && value.length <= length;

export const strictEqual = (value: unknown, other: unknown): boolean => value === other;

/** Higher-order validator: runs one fence per attribute of the shape, keyed by attribute. */
export const policy = (
    entity: unknown,
    shape: Readonly<Record<string, Fence>>,
): Readonly<Record<string, Result>> => {
    const record = (entity ?? {}) as Record<string, unknown>;
    return Object.fromEntries(
        Object.entries(shape).map(([attribute, fence]) => [
            attribute,
            fence.run(record[attribute]),
        ]),
    );
};

/** Higher-order validator: every item of an array must pass the fence. */
export const each = (items: unknown, fence: Fence): readonly Result[] | boolean =>
    Array.isArray(items) ? items.map((item: unknown) => fence.run(item)) : false;
