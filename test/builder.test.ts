import { describe, expect, test } from 'vitest';

import { EmptyFenceError, Fence, FenceBuilder, RegistrationError } from '../src/index.js';
import * as v from './support/validators.js';

const base = FenceBuilder.create()
    .register('required', v.required)
    .register('min', v.minLength)
    .register('max', v.maxLength);

describe('FenceBuilder registration', () => {
    test('create() and new FenceBuilder() are equivalent empty builders', () => {
        expect(FenceBuilder.create()).toBeInstanceOf(FenceBuilder);
        expect(new FenceBuilder().registry).toEqual({});
        expect(new FenceBuilder().steps).toEqual([]);
    });

    test('register returns a new builder exposing a fluent method', () => {
        const next = FenceBuilder.create().register('eq', v.strictEqual);

        expect(typeof next.eq).toBe('function');
        expect(next.registry).toEqual({ eq: v.strictEqual });
        expect(Object.keys(next)).toEqual([]); // fluent methods are not enumerable
    });

    test('registerAll registers every key of a record', () => {
        const next = FenceBuilder.create().registerAll({ eq: v.strictEqual, min: v.minLength });

        expect(Object.keys(next.registry)).toEqual(['eq', 'min']);
        expect(
            next
                .eq('a')
                .min(1)
                .steps.map((step) => step.name),
        ).toEqual(['eq', 'min']);
    });

    test('register does not touch the receiver or the class prototype', () => {
        const before = Object.getOwnPropertyNames(FenceBuilder.prototype);
        const empty = FenceBuilder.create();
        const next = empty.register('eq', v.strictEqual);

        expect(next).not.toBe(empty);
        expect('eq' in empty).toBe(false);
        expect('eq' in FenceBuilder.create()).toBe(false);
        expect(Object.getOwnPropertyNames(FenceBuilder.prototype)).toEqual(before);
    });

    test('builders keep a flat prototype chain no matter how they are derived', () => {
        let builder = FenceBuilder.create().register('eq', v.strictEqual);
        for (let i = 0; i < 10; i++) {
            builder = builder.eq(i).register(`step${String(i)}`, v.required);
        }

        expect(Object.getPrototypeOf(builder)).toBe(FenceBuilder.prototype);
    });

    test('rejects duplicate, reserved, empty and non-function registrations', () => {
        expect(() => base.register('min', v.minLength)).toThrow(RegistrationError);
        expect(() => base.register('min', v.minLength)).toThrow(/already registered/);

        for (const reserved of ['build', 'register', 'step', 'then', 'constructor', '__proto__']) {
            expect(() => base.register(reserved as 'x', v.required)).toThrow(/reserved/);
        }

        expect(() => base.register('' as 'x', v.required)).toThrow(RegistrationError);
        expect(() =>
            base.registerAll({ nope: 'not a function' as unknown as typeof v.required }),
        ).toThrow(/must be a function/);
    });
});

describe('FenceBuilder composition', () => {
    test('step methods return a new builder and never mutate the receiver', () => {
        const user = base.required().max(255);
        const username = user.min(4);
        const password = user.min(8);

        expect(username).not.toBe(password);
        expect(user.steps.map((s) => s.name)).toEqual(['required', 'max']);
        expect(username.steps.map((s) => [s.name, ...s.args])).toEqual([
            ['required'],
            ['max', 255],
            ['min', 4],
        ]);
        expect(password.steps.at(-1)).toEqual({ name: 'min', args: [8] });
    });

    test('fluent methods are sugar for step()', () => {
        expect(base.min(4).steps).toEqual(base.step('min', 4).steps);
    });

    test('recorded steps are frozen', () => {
        const [step] = base.min(4).steps;

        expect(Object.isFrozen(step)).toBe(true);
        expect(Object.isFrozen(step?.args)).toBe(true);
        expect(Object.isFrozen(base.steps)).toBe(false); // the array is a fresh copy per builder
    });

    test('step() rejects unregistered names at composition time', () => {
        expect(() => base.step('nope' as 'min', 4)).toThrow(RegistrationError);
    });

    test('a builder can be extended after steps have been recorded', () => {
        const fence = base.required().register('eq', v.strictEqual).eq('a').build();

        expect(fence.run('a').passed).toBe(true);
        expect(fence.run('b').passed).toBe(false);
    });

    test('build() returns a Fence and rejects an empty builder', () => {
        expect(base.required().build()).toBeInstanceOf(Fence);
        expect(() => base.build()).toThrow(EmptyFenceError);
    });

    test('fluent methods require the builder as receiver', () => {
        const { min } = base;
        expect(() => min(1)).toThrow(TypeError);
    });

    test('registry is frozen and stable per builder lineage', () => {
        expect(Object.isFrozen(base.registry)).toBe(true);
        expect(base.registry).toBe(base.min(1).registry);
        expect(base.registry).not.toBe(base.register('eq', v.strictEqual).registry);
    });
});

describe('FenceBuilder deprecated aliases', () => {
    /* eslint-disable @typescript-eslint/no-deprecated */
    test('fork() returns the same builder', () => {
        expect(base.fork()).toBe(base);
    });

    test('serialize() and hydrate() route through toJSON/fromJSON', () => {
        const builder = base.required().min(4);
        const serialized = builder.serialize();

        expect(JSON.parse(serialized)).toEqual(builder.toJSON());
        expect(base.hydrate(serialized).steps).toEqual(builder.steps);
    });
    /* eslint-enable @typescript-eslint/no-deprecated */
});
