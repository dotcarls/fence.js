import { describe, expect, test, vi } from 'vitest';

import { Invokable } from '../src/index.js';

describe('Invokable', () => {
    test('empty constructor throws', () => {
        // @ts-expect-error -- exercising the runtime guard
        expect(() => new Invokable()).toThrow();
    });

    test('no fn throws', () => {
        // @ts-expect-error -- exercising the runtime guard
        expect(() => new Invokable(null, 'name', [], true)).toThrow();
    });

    test('anonymous fn without a name throws', () => {
        expect(() => new Invokable(() => true)).toThrow();
    });

    test('non-array args throws', () => {
        // @ts-expect-error -- exercising the runtime guard
        expect(() => new Invokable(() => true, 'name', 'string')).toThrow();
    });

    test('non-boolean memoize throws', () => {
        // @ts-expect-error -- exercising the runtime guard
        expect(() => new Invokable(() => true, 'name', [], null)).toThrow();
    });

    test('anonymous fn with a name is created', () => {
        expect(new Invokable(() => true, 'name')).toBeInstanceOf(Invokable);
        expect(new Invokable(() => true, 'name')._name).toBe('name');
    });

    test('named fn without a name uses the function name', () => {
        const fn = () => true;
        expect(new Invokable(fn)._name).toBe('fn');
    });

    test('explicit name overrides the function name', () => {
        const fn = () => true;
        expect(new Invokable(fn, 'name')._name).toBe('name');
    });

    test('default properties', () => {
        const fn = () => true;
        const invokable = new Invokable(fn);

        expect(invokable).toHaveProperty('_name', 'fn');
        expect(invokable).toHaveProperty('_args', []);
        expect(invokable).toHaveProperty('_memoize', false);
        expect(invokable).not.toHaveProperty('_cache');
        expect(invokable).not.toHaveProperty('_memoizedFn');
    });

    test('memoized instantiates', () => {
        const fn = () => true;
        const invokable = new Invokable(fn, null, [], true);

        expect(invokable).toHaveProperty('_name', 'fn');
        expect(invokable).toHaveProperty('_memoize', true);
        expect(invokable).toHaveProperty('_memoizedFn');
    });

    test('can be invoked, memoized or not', () => {
        const fn = () => true;
        expect(new Invokable(fn).invoke()).toBe(true);
        expect(new Invokable(fn, null, [], true).invoke()).toBe(true);
    });

    test('memoized uses the "none" key when there are no arguments', () => {
        const invokable = new Invokable(() => true, 'fn', [], true);
        expect(invokable.invoke()).toBe(true);
        expect(invokable._cache).toHaveProperty('none', true);
    });

    test('memoized uses the first argument as the key', () => {
        const invokable = new Invokable(() => true, 'fn', [], true);
        expect(invokable.invoke('a')).toBe(true);
        expect(invokable._cache).toHaveProperty('a', true);
    });

    test('memoized does not call the function twice for the same args', () => {
        const counter = vi.fn();
        const fn = () => {
            counter();
            return true;
        };
        const invokable = new Invokable(fn, null, [], true);

        invokable.invoke('a');
        invokable.invoke('a');
        invokable.invoke('b');
        expect(counter).toHaveBeenCalledTimes(2);

        invokable.dememoize();
        invokable.invoke('a');
        invokable.invoke('a');
        expect(counter).toHaveBeenCalledTimes(4);
    });

    test('dememoize clears the memo properties', () => {
        const invokable = new Invokable(() => true, 'fn', [], true);
        invokable.invoke('a');
        expect(invokable).toHaveProperty('_cache');

        invokable.dememoize();

        expect(invokable).toHaveProperty('_memoize', false);
        expect(invokable).not.toHaveProperty('_cache');
        expect(invokable).not.toHaveProperty('_memoizedFn');
    });

    test('serialize is stringified correctly', () => {
        const fn = () => true;
        const parsed = JSON.parse(new Invokable(fn, null, [], false).serialize()) as object;

        expect(parsed).toHaveProperty('_name', 'fn');
        expect(parsed).toHaveProperty('_args', []);
        expect(parsed).toHaveProperty('_memoize', false);
    });
});
