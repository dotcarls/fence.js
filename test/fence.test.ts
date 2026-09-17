import { inspect } from 'node:util';

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

    test('exposes frozen steps, the registry, a string tag and a Node.js inspection', () => {
        const fence = base.min(3).build();

        expect(fence.steps).toEqual([{ name: 'min', args: [3] }]);
        expect(Object.isFrozen(fence.steps)).toBe(true);
        expect(fence.registry).toBe(base.registry);
        expect(Object.prototype.toString.call(fence)).toBe('[object Fence]');
        expect(Object.keys(fence)).toEqual([]);
        expect(inspect(fence)).toContain("name: 'min'");
    });

    test('outcome entries are frozen', () => {
        const [outcome] = base.min(1).build().run('a').outcomes;

        expect(Object.isFrozen(outcome)).toBe(true);
    });

    test('calls validators as plain functions with the subject then the recorded args', () => {
        const spy = vi.fn(function (this: unknown, _subject: unknown, _a: number, _b: string) {
            return this === undefined;
        });
        const fence = FenceBuilder.create().register('spy', spy).spy(1, 'two').build();

        expect(fence.run('subject').passed).toBe(true);
        expect(spy).toHaveBeenCalledWith('subject', 1, 'two');
    });

    test('exceptions thrown by validators propagate unchanged', () => {
        const boom = new Error('boom');
        const fence = FenceBuilder.create()
            .register('explode', (): boolean => {
                throw boom;
            })
            .explode()
            .build();

        expect(() => fence.run('x')).toThrow(boom);
    });

    test.each([
        ['a string', 'yes', /returned "yes"/],
        ['a number', 1, /returned 1/],
        ['null', null, /returned null/],
        ['undefined', undefined, /returned undefined/],
        ['an object with a non-Result', { a: 1 }, /returned \{a: 1\}/],
        ['an array with a non-Result', [1], /returned \[1\]/],
        // eslint-disable-next-line no-sparse-arrays -- the hole is the point
        ['a sparse array', [, new Result('s', [])], /returned \[undefined, \[object Result\]\]/],
        ['a Promise (async validator)', Promise.resolve(true), /returned \[object Promise\]/],
        ['a Date', new Date(0), /returned \[object Date\]/],
    ])('rejects a validator that returns %s', (_label, value, message) => {
        const fence = FenceBuilder.create()
            .register('bad', (() => value) as unknown as (s: unknown) => boolean)
            .bad()
            .build();

        expect(() => fence.run('x')).toThrow(InvalidOutcomeError);
        expect(() => fence.run('x')).toThrow(message);
    });

    test('accepts arrays and records of Results as outcomes, including empty ones', () => {
        const inner = base.min(2).build();
        const fence = FenceBuilder.create()
            .register('each', v.each)
            .register('policy', v.policy)
            .register('none', () => ({}))
            .each(inner)
            .policy({ name: inner })
            .none()
            .build();

        const result = fence.run(['ab', 'c']);
        const [each] = result.for('each');
        const [policy] = result.for('policy');

        expect(each).toHaveLength(2);
        expect((each as Result[]).every((item) => item instanceof Result)).toBe(true);
        expect(policy).toEqual({ name: expect.any(Result) as Result });
        expect((policy as Record<string, Result>).name?.subject).toBeUndefined();
        expect(result.for('none')).toEqual([{}]);
        expect(new Result('s', [{ step: { name: 'none', args: [] }, value: {} }]).passed).toBe(
            true,
        );
    });
});

describe('Fence construction', () => {
    test('the constructor rejects bad arguments and steps the registry cannot satisfy', () => {
        expect(() => new Fence(new Map(), [{ name: 'ghost', args: [] }])).toThrow(
            RegistrationError,
        );
        expect(() => new Fence({} as never, [{ name: 'x', args: [] }])).toThrow(TypeError);
        expect(() => new Fence(new Map(), 'steps' as never)).toThrow(TypeError);
        expect(() => new Fence(base.entries, [])).toThrow(/no steps/);
    });

    test("can be built directly from a builder's entries and steps", () => {
        const fence = new Fence(base.entries, base.min(1).steps);

        expect(fence.run('a').passed).toBe(true);
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

        for (const subject of [
            1,
            '1',
            'constructor',
            NaN,
            NaN,
            undefined,
            undefined,
            null,
            null,
            0,
            -0,
        ]) {
            fence.run(subject);
        }
        expect(calls).toEqual([1, '1', 'constructor', NaN, undefined, null, 0]);
    });

    test('keys objects and functions by identity and symbols by value', () => {
        const { calls, validator } = counting();
        const a = { id: 1 };
        const fn = () => 1;
        const sym = Symbol('s');
        const fence = FenceBuilder.create()
            .register('eq', validator, { memoize: true })
            .eq(a)
            .build();

        for (const subject of [a, { id: 1 }, a, fn, fn, sym, sym]) {
            fence.run(subject);
        }
        expect(calls).toEqual([a, { id: 1 }, fn, sym]);
    });

    test('caches nested outcomes too', () => {
        let calls = 0;
        const inner = base.min(1).build();
        const fence = FenceBuilder.create()
            .register(
                'each',
                (items: readonly unknown[], f: Fence) => {
                    calls++;
                    return v.each(items, f);
                },
                { memoize: { key: (items) => JSON.stringify(items) } },
            )
            .each(inner)
            .build();

        expect(fence.run(['a']).passed).toBe(true);
        expect(fence.run(['a']).passed).toBe(true);
        expect(calls).toBe(1);
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

describe('Fence review follow-ups', () => {
    test('the constructor validates and freezes hand-made steps', () => {
        const step = { name: 'min', args: [2] };
        const fence = new Fence(base.entries, [step]);

        expect(Object.isFrozen(fence.steps[0])).toBe(true);
        expect(Object.isFrozen(fence.steps[0]?.args)).toBe(true);
        step.args[0] = 5;
        expect(fence.run('ab').passed).toBe(true); // the recorded step did not change
        expect(() => new Fence(base.entries, [{ name: 'min' } as never])).toThrow(
            /step 0 must be \{ name: string, args: unknown\[\] \}/,
        );
    });
});
