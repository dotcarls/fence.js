import { inspect } from 'node:util';

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
        expect(new FenceBuilder().entries.size).toBe(0);
    });

    test('register returns a new builder exposing a fluent method', () => {
        const next = FenceBuilder.create().register('eq', v.strictEqual);

        expect(typeof next.eq).toBe('function');
        expect(next.registry).toEqual({ eq: v.strictEqual });
        expect(Object.keys(next)).toEqual([]); // fluent methods are not enumerable
    });

    test('registerAll registers every key of a record, with shared options', () => {
        const next = FenceBuilder.create().registerAll(
            { eq: v.strictEqual, min: v.minLength },
            { memoize: true },
        );

        expect(Object.keys(next.registry)).toEqual(['eq', 'min']);
        expect(next.entries.get('eq')?.options).toEqual({ memoize: true });
        expect(
            next
                .eq('a')
                .min(1)
                .steps.map((step) => step.name),
        ).toEqual(['eq', 'min']);
    });

    test('registerAll copies another builder including its options', () => {
        const source = FenceBuilder.create().register('eq', v.strictEqual, { memoize: true });
        const merged = base.registerAll(source);

        expect(Object.keys(merged.registry)).toEqual(['required', 'min', 'max', 'eq']);
        expect(merged.entries.get('eq')).toEqual({ fn: v.strictEqual, options: { memoize: true } });
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

    test('a dynamically named registration works at run time', () => {
        const name = 'dyn' as string;
        const wide = base.register(name, v.strictEqual);

        expect(wide.dyn?.('a').build().run('a').passed).toBe(true);
        expect(wide.min?.(2).build().run('ab').passed).toBe(true);
    });

    test('rejects duplicate, reserved, empty and non-function registrations', () => {
        expect(() => base.register('min' as 'x', v.minLength)).toThrow(RegistrationError);
        expect(() => base.register('min' as 'x', v.minLength)).toThrow(/already registered/);

        const reserved = [
            ...Object.getOwnPropertyNames(FenceBuilder.prototype),
            ...Object.getOwnPropertyNames(Object.prototype),
            'then',
            'prototype',
        ];
        for (const name of reserved) {
            expect(() => base.register(name as 'x', v.required)).toThrow(/reserved/);
            expect(() =>
                base.registerAll({ [name]: v.required } as Record<'x', typeof v.required>),
            ).toThrow(/reserved/);
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

    test('steps and their arguments are frozen, and shared arrays cannot be mutated', () => {
        const withStep = base.min(4);
        const sibling = withStep.register('eq', v.strictEqual);
        const [step] = withStep.steps;

        expect(Object.isFrozen(step)).toBe(true);
        expect(Object.isFrozen(step?.args)).toBe(true);
        expect(Object.isFrozen(withStep.steps)).toBe(true);
        expect(() => (withStep.steps as unknown[]).push('x')).toThrow(TypeError);
        expect(sibling.steps).toEqual(withStep.steps);
        expect(withStep.build().steps).toHaveLength(1);
    });

    test('step arguments are recorded by reference, not copied', () => {
        const arg = { limit: 3 };
        const builder = FenceBuilder.create().register('eq', v.strictEqual).eq(arg);

        expect(builder.steps[0]?.args[0]).toBe(arg);
    });

    test('step() rejects unregistered and non-string names at composition time', () => {
        expect(() => base.step('nope' as 'min', 4)).toThrow(RegistrationError);
        expect(() => base.step(Symbol('s') as unknown as 'min', 4)).toThrow(RegistrationError);
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

    test('has a string tag and a useful Node.js inspection', () => {
        const builder = base.min(1);

        expect(Object.prototype.toString.call(builder)).toBe('[object FenceBuilder]');
        expect(inspect(builder)).toContain("registry: [ 'required', 'min', 'max' ]");
        expect(inspect(builder)).toContain("name: 'min'");
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
        expect(base.max(1).hydrate(serialized).steps).toEqual(builder.steps); // base steps are not kept
    });

    test('hydrate() points v1 output at fromLegacyJSON', () => {
        const v1 = JSON.stringify([JSON.stringify({ _name: 'min', _args: [1] })]);
        expect(() => base.hydrate(v1)).toThrow(
            /looks like v1 serialize\(\) output; use FenceBuilder.fromLegacyJSON/,
        );
    });
    /* eslint-enable @typescript-eslint/no-deprecated */
});

describe('FenceBuilder review follow-ups', () => {
    test('trailing undefined arguments are dropped when a step is recorded', () => {
        const between = (v: number, lo: number, hi?: number) =>
            v >= lo && (hi === undefined || v <= hi);
        const builder = FenceBuilder.create().register('between', between);
        const hi: number | undefined = undefined;

        expect(builder.between(1, hi).steps).toEqual([{ name: 'between', args: [1] }]);
        expect(builder.between(1, undefined).toJSON()).toEqual(builder.between(1).toJSON());
        expect(builder.between(1, hi).build().run(5).passed).toBe(true);
        // Only trailing ones: an undefined in the middle is kept (and is not serializable).
        const eq = FenceBuilder.create().register('eq', (_v: unknown, ..._a: unknown[]) => true);
        expect(eq.eq(undefined, 1).steps[0]?.args).toEqual([undefined, 1]);
    });

    test('registerAll rejects a builder with an overlapping name at run time', () => {
        const other = FenceBuilder.create().register('min', v.minLength);
        expect(() => base.registerAll(other as never)).toThrow(/'min' is already registered/);
    });

    test('a plain registry passed to fromJSON is validated like registerAll', () => {
        const json = { fence: 2, steps: [{ name: 'min', args: [1] }] };

        expect(() => FenceBuilder.fromJSON(json, { min: v.minLength, build: v.required })).toThrow(
            RegistrationError,
        );
        expect(() => FenceBuilder.fromJSON(json, { min: v.minLength, then: v.required })).toThrow(
            /reserved/,
        );
        expect(() =>
            FenceBuilder.fromJSON(json, { min: 5 as unknown as typeof v.minLength }),
        ).toThrow(/must be a function/);
        expect(() => FenceBuilder.fromLegacyJSON('[]', { toString: v.required })).toThrow(
            /reserved/,
        );
    });

    test('fromJSON accepts a live fence or builder in place of its JSON', () => {
        const fence = base.min(2).build();

        expect(FenceBuilder.fromJSON(fence, base).steps).toEqual(fence.steps);
        expect(FenceBuilder.fromJSON(base.min(3), base).steps).toEqual([
            { name: 'min', args: [3] },
        ]);
        expect(() => FenceBuilder.fromJSON(new Date(0), base)).toThrow(
            /must be a plain object, got \[object Date\]/,
        );
    });
});
