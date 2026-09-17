import { describe, expect, test } from 'vitest';

import {
    EmptyFenceError,
    FenceError,
    HydrationError,
    InvalidOutcomeError,
    RegistrationError,
    SerializationError,
} from '../src/index.js';

describe('errors', () => {
    test.each([
        ['RegistrationError', new RegistrationError('r')],
        ['EmptyFenceError', new EmptyFenceError()],
        ['SerializationError', new SerializationError('s')],
        ['HydrationError', new HydrationError('h')],
        ['InvalidOutcomeError', new InvalidOutcomeError({ name: 'x', args: [] }, 1)],
    ])('%s is a FenceError and an Error with a matching name', (name, error) => {
        expect(error).toBeInstanceOf(FenceError);
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe(name);
        expect(error.stack).toContain(name);
    });

    test('every error accepts a cause', () => {
        const cause = new Error('root');

        expect(new FenceError('f', { cause }).cause).toBe(cause);
        expect(new SerializationError('s', { cause }).cause).toBe(cause);
        expect(new FenceError('f').cause).toBeUndefined();
    });

    test('EmptyFenceError has a default message', () => {
        expect(new EmptyFenceError().message).toMatch(/no steps/);
    });

    test('HydrationError carries the missing names and an optional cause', () => {
        const cause = new SyntaxError('bad');
        const error = new HydrationError('h', { missing: ['a', 'b'], cause });

        expect(error.missing).toEqual(['a', 'b']);
        expect(error.cause).toBe(cause);
        expect(new HydrationError('h').missing).toEqual([]);
        expect(new HydrationError('h', { cause }).missing).toEqual([]);
    });

    test('InvalidOutcomeError describes the step and the value', () => {
        const error = new InvalidOutcomeError(
            { name: 'x', args: [1] },
            { deep: { value: 'y'.repeat(80) } },
        );

        expect(error.step).toEqual({ name: 'x', args: [1] });
        expect(error.value).toEqual({ deep: { value: 'y'.repeat(80) } });
        expect(error.message).toMatch(/^Validator 'x' returned \{deep: \{value: "yyy.*…; expected/);
    });
});
