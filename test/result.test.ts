import { inspect } from 'node:util';

import { describe, expect, test } from 'vitest';

import { FenceBuilder, Result, type Step } from '../src/index.js';
import * as v from './support/validators.js';

const step = (name: string, ...args: unknown[]): Step => ({ name, args });
const bools = (...values: boolean[]) =>
    new Result(
        's',
        values.map((value, i) => ({ step: step(`s${String(i)}`), value })),
    );

describe('Result verdicts', () => {
    test('passed and anyPassed over boolean outcomes', () => {
        expect(bools(true, true).passed).toBe(true);
        expect(bools(true, false).passed).toBe(false);
        expect(bools(true, false).anyPassed).toBe(true);
        expect(bools(false, false).anyPassed).toBe(false);
    });

    test('nested arrays and records fold into the verdict', () => {
        const passing = bools(true);
        const failing = bools(false, false);
        const mixed = bools(true, false);

        expect(new Result('s', [{ step: step('n'), value: [passing] }]).passed).toBe(true);
        expect(new Result('s', [{ step: step('n'), value: [passing, mixed] }]).passed).toBe(false);
        expect(new Result('s', [{ step: step('n'), value: { a: passing } }]).passed).toBe(true);
        expect(new Result('s', [{ step: step('n'), value: { a: failing } }]).anyPassed).toBe(false);
        expect(
            new Result('s', [{ step: step('n'), value: { a: failing, b: mixed } }]).anyPassed,
        ).toBe(true);
    });

    test('empty nested collections are vacuously passed and not anyPassed', () => {
        const result = new Result('s', [{ step: step('n'), value: [] }]);

        expect(result.passed).toBe(true);
        expect(result.anyPassed).toBe(false);
        expect(result.explain()).toContain('(no nested results)');
    });

    test('a Result with no outcomes is vacuously passed', () => {
        expect(new Result('s', []).passed).toBe(true);
        expect(new Result('s', []).anyPassed).toBe(false);
    });

    test('the constructor validates and freezes its outcomes', () => {
        expect(() => new Result('s', null as unknown as [])).toThrow(TypeError);
        expect(() => new Result('s', [{ value: true }] as unknown as [])).toThrow(
            /outcome 0 must be/,
        );
        expect(
            () => new Result('s', [{ step: { name: 1 }, value: true }] as unknown as []),
        ).toThrow(TypeError);

        const entry = { step: step('a'), value: true };
        const result = new Result('s', [entry]);
        expect(Object.isFrozen(result.outcomes)).toBe(true);
        expect(Object.isFrozen(result.outcomes[0])).toBe(true);
        expect(result.outcomes[0]).not.toBe(entry);
        entry.value = false;
        expect(result.passed).toBe(true);
    });
});

describe('Result queries', () => {
    const base = FenceBuilder.create()
        .register('required', v.required)
        .register('min', v.minLength)
        .register('max', v.maxLength)
        .register('email', v.isEmail)
        .register('policy', v.policy)
        .register('each', v.each);

    const user = base.required().max(255);
    const userPolicy = base
        .policy({
            username: user.min(4).email().build(),
            password: user.min(8).build(),
        })
        .build();

    test('for(name) returns every outcome recorded under that name', () => {
        const result = base.min(1).max(3).min(2).build().run('ab');

        expect(result.for('min')).toEqual([true, true]);
        expect(result.for('max')).toEqual([true]);
        expect(result.for('nope')).toEqual([]);
    });

    test('failures() flattens nested results into paths', () => {
        const result = userPolicy.run({ username: 'tim', password: 'hunter22' });

        expect(result.passed).toBe(false);
        expect(result.failures()).toEqual([
            {
                path: ['policy', 'username', 'min'],
                step: { name: 'min', args: [4] },
                subject: 'tim',
            },
            {
                path: ['policy', 'username', 'email'],
                step: { name: 'email', args: [] },
                subject: 'tim',
            },
        ]);
    });

    test('failures() uses indices for nested arrays, recurses to any depth, and is empty when passed', () => {
        const fence = base.each(base.min(2).build()).build();
        const deep = base.each(base.policy({ name: base.min(2).build() }).build()).build();

        expect(
            fence
                .run(['ab', 'c', 'de'])
                .failures()
                .map((f) => f.path),
        ).toEqual([['each', '1', 'min']]);
        expect(fence.run(['ab', 'cd']).failures()).toEqual([]);
        expect(deep.run([{ name: 'ab' }, { name: 'c' }]).failures()).toEqual([
            {
                path: ['each', '1', 'policy', 'name', 'min'],
                step: { name: 'min', args: [2] },
                subject: 'c',
            },
        ]);
    });

    test('explain() reports the verdict, each step and nested results', () => {
        const text = userPolicy.run({ username: 'tim@example.com', password: 'short' }).explain();

        expect(text).toBe(
            [
                'subject: {username: "tim@example.com", password: "short"}',
                'FAILED (0/1 steps)',
                '  [x] policy({username: Fence(4 steps), password: Fence(3 steps)})',
                '      username:',
                '        subject: "tim@example.com"',
                '        PASSED (4/4 steps)',
                '          [✓] required',
                '          [✓] max(255)',
                '          [✓] min(4)',
                '          [✓] email',
                '      password:',
                '        subject: "short"',
                '        FAILED (2/3 steps)',
                '          [✓] required',
                '          [✓] max(255)',
                '          [x] min(8)',
            ].join('\n'),
        );
    });

    test('explain() survives cyclic subjects and huge values', () => {
        const cyclic: Record<string, unknown> = { name: 'x' };
        cyclic.self = cyclic;
        const text = base.min(1).build().run(cyclic).explain();

        expect(text).toContain('subject: {name: "x", self: [Circular]}');
        expect(
            base.min(1).build().run('y'.repeat(500)).explain().split('\n')[0]?.length,
        ).toBeLessThan(80);
        expect(
            base
                .min(1)
                .build()
                .run(Array.from({ length: 50 }, (_, i) => i))
                .explain(),
        ).toContain('…');
    });

    test('toJSON() gives plain data with tagged fences and described non-JSON arguments', () => {
        const fn = () => true;
        const fence = base
            .register('any', (_s: unknown, ..._args: unknown[]) => true)
            .any(fn, base.min(1).build(), new Date(0))
            .each(base.min(2).build())
            .build();
        const json = JSON.parse(JSON.stringify(fence.run(['ab', 'c']))) as unknown;

        expect(json).toEqual({
            subject: ['ab', 'c'],
            passed: false,
            outcomes: [
                {
                    name: 'any',
                    args: [
                        '[Function fn]',
                        { $fence: { fence: 2, steps: [{ name: 'min', args: [1] }] } },
                        '[object Date]',
                    ],
                    value: true,
                },
                {
                    name: 'each',
                    args: [{ $fence: { fence: 2, steps: [{ name: 'min', args: [2] }] } }],
                    value: [
                        {
                            subject: 'ab',
                            passed: true,
                            outcomes: [{ name: 'min', args: [2], value: true }],
                        },
                        {
                            subject: 'c',
                            passed: false,
                            outcomes: [{ name: 'min', args: [2], value: false }],
                        },
                    ],
                },
            ],
        });
    });

    test('has a string tag and a useful Node.js inspection', () => {
        const result = base.min(2).build().run('a');

        expect(Object.prototype.toString.call(result)).toBe('[object Result]');
        expect(inspect(result)).toContain("step: 'min(2)'");
        expect(inspect(result)).toContain('passed: false');
    });

    test('deprecated aliases delegate to the new API', () => {
        const result = base.min(1).min(5).build().run('abc');

        /* eslint-disable @typescript-eslint/no-deprecated */
        expect(result.forAll()).toBe(result.passed);
        expect(result.forAny()).toBe(result.anyPassed);
        expect(result.forOne('min')).toEqual(result.for('min'));
        /* eslint-enable @typescript-eslint/no-deprecated */
    });
});

describe('Result review follow-ups', () => {
    const base = FenceBuilder.create()
        .register('min', v.minLength)
        .register('each', v.each)
        .register('any', (_s: unknown, ..._args: unknown[]) => true);

    test('toJSON() never throws: nested fences with non-JSON arguments and odd subjects are described', () => {
        const inner = base
            .any(() => 1, new Date(0))
            .min(1)
            .build();
        const result = base.each(inner).build().run(['a']);
        const json = JSON.parse(JSON.stringify(result)) as { outcomes: { args: unknown[] }[] };

        expect(json.outcomes[0]?.args).toEqual([
            {
                $fence: {
                    fence: 2,
                    steps: [
                        { name: 'any', args: ['[Function anonymous]', '[object Date]'] },
                        { name: 'min', args: [1] },
                    ],
                },
            },
        ]);

        const cyclic: Record<string, unknown> = {};
        cyclic.self = cyclic;
        expect(base.min(1).build().run(10n).toJSON().subject).toBe('10n');
        expect(base.min(1).build().run(cyclic).toJSON().subject).toEqual({ self: '[Circular]' });
        expect(base.min(1).build().run(undefined).toJSON().subject).toBe('undefined');
        expect(() =>
            JSON.stringify(
                base
                    .min(1)
                    .build()
                    .run(new Map([[1, 2]])),
            ),
        ).not.toThrow();
    });

    test('the constructor rejects outcome values that are not outcomes', () => {
        const step = { name: 'x', args: [] };
        for (const value of [42, null, undefined, 'yes', [1], { a: 1 }]) {
            expect(() => new Result('s', [{ step, value: value as never }])).toThrow(
                /where value is a boolean, an array of Results or a record of Results/,
            );
        }
        expect(new Result('s', [{ step, value: {} }]).passed).toBe(true);
    });
});
