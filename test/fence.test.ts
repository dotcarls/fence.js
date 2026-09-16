import { describe, expect, test, vi } from 'vitest';

import {
    Fence,
    FenceBuilder,
    InvalidOutcomeError,
    RegistrationError,
    Result,
} from '../src/index.js';
import * as v from './support/validators.js';

const base = FenceBuilder.create()
    .register('required', v.required)
    .register('min', v.minLength)
    .register('eq', v.strictEqual);

describe('Fence.run', () => {
    test('runs every step in order against the subject', () => {
        const fence = base.required().min(3).eq('abc').build();
        const result = fence.run('abc');

        expect(result.subject).toBe('abc');
        expect(result.outcomes.map(({ step, value }) => [step.name, value])).toEqual([
            ['required', true],
            ['min', true],
            ['eq', true],
        ]);
        expect(fence.run('ab').outcomes.map(({ value }) => value)).toEqual([true, false, false]);
    });

    test('exposes its steps and a Fence string tag', () => {
        const fence = base.min(3).build();

        expect(fence.steps).toEqual([{ name: 'min', args: [3] }]);
        expect(Object.prototype.toString.call(fence)).toBe('[object Fence]');
    });

    test('calls validators as plain functions with the subject then the recorded args', () => {
        const spy = vi.fn(function (this: unknown, _subject: unknown, _a: number, _b: string) {
            return this === undefined;
        });
        const fence = FenceBuilder.create().register('spy', spy).spy(1, 'two').build();

        expect(fence.run('subject').passed).toBe(true);
        expect(spy).toHaveBeenCalledWith('subject', 1, 'two');
    });

    test('rejects validators that return something other than an outcome', () => {
        const fence = FenceBuilder.create()
            .register('bad', (() => 'yes') as unknown as (s: unknown) => boolean)
            .bad()
            .build();

        expect(() => fence.run('x')).toThrow(InvalidOutcomeError);
        expect(() => fence.run('x')).toThrow(/Validator 'bad' returned "yes"/);
    });

    test('accepts arrays and records of Results as outcomes', () => {
        const inner = base.min(2).build();
        const fence = FenceBuilder.create()
            .register('each', v.each)
            .register('policy', v.policy)
            .each(inner)
            .policy({ name: inner })
            .build();

        const result = fence.run(['ab', 'c']);
        expect(result.for('each')[0]).toHaveLength(2);
        expect(result.for('each')[0]).toSatisfy((items: unknown) =>
            (items as unknown[]).every((item) => item instanceof Result),
        );
    });
});

describe('Fence internals', () => {
    test('the internal constructor rejects steps that the registry cannot satisfy', () => {
        expect(() => new Fence(new Map(), [{ name: 'ghost', args: [] }])).toThrow(
            RegistrationError,
        );
    });
});

describe('Fence memoization', () => {
    const counting = () => {
        const calls: unknown[] = [];
        const validator = (subject: unknown, other: unknown) => {
            calls.push(subject);
            return subject === other;
        };
        return { calls, validator };
    };

    test('caches false outcomes as well as true ones', () => {
        const { calls, validator } = counting();
        const fence = FenceBuilder.create()
            .register('eq', validator, { memoize: true })
            .eq('a')
            .build();

        expect([fence.run('b').passed, fence.run('b').passed, fence.run('a').passed]).toEqual([
            false,
            false,
            true,
        ]);
        expect(calls).toEqual(['b', 'a']);
    });

    test('keys by SameValueZero, not by string coercion', () => {
        const { calls, validator } = counting();
        const fence = FenceBuilder.create()
            .register('eq', validator, { memoize: true })
            .eq(1)
            .build();

        expect(fence.run(1).passed).toBe(true);
        expect(fence.run('1').passed).toBe(false);
        expect(fence.run('constructor').passed).toBe(false);
        expect(fence.run(NaN).passed).toBe(false);
        expect(fence.run(NaN).passed).toBe(false);
        expect(calls).toEqual([1, '1', 'constructor', NaN]);
    });

    test('keys objects by identity', () => {
        const { calls, validator } = counting();
        const a = { id: 1 };
        const fence = FenceBuilder.create()
            .register('eq', validator, { memoize: true })
            .eq(a)
            .build();

        expect(fence.run(a).passed).toBe(true);
        expect(fence.run({ id: 1 }).passed).toBe(false);
        expect(fence.run(a).passed).toBe(true);
        expect(calls).toHaveLength(2);
    });

    test('supports a custom key function', () => {
        const { calls, validator } = counting();
        const fence = FenceBuilder.create()
            .register('eq', validator, { memoize: { key: (s) => String(s).toLowerCase() } })
            .eq('a')
            .build();

        expect(fence.run('a').passed).toBe(true);
        expect(fence.run('A').passed).toBe(true); // served from the cache
        expect(calls).toEqual(['a']);
    });

    test('keys symbols weakly unless they are registered', () => {
        const { calls, validator } = counting();
        const local = Symbol('local');
        const fence = FenceBuilder.create()
            .register('eq', validator, {
                memoize: { key: (s) => (s === 'registered' ? Symbol.for('shared') : local) },
            })
            .eq('x')
            .build();

        fence.run('a');
        fence.run('b'); // same local symbol key -> cached
        fence.run('registered');
        fence.run('registered');
        expect(calls).toEqual(['a', 'registered']);
    });

    test('each built fence owns its cache', () => {
        const { calls, validator } = counting();
        const builder = FenceBuilder.create().register('eq', validator, { memoize: true }).eq('a');

        builder.build().run('a');
        builder.build().run('a');
        expect(calls).toEqual(['a', 'a']);
    });

    test('is off by default', () => {
        const { calls, validator } = counting();
        const fence = FenceBuilder.create().register('eq', validator).eq('a').build();

        fence.run('a');
        fence.run('a');
        expect(calls).toEqual(['a', 'a']);
    });
});
