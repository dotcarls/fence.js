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

    test('outcomes must be an array', () => {
        expect(() => new Result('s', null as unknown as [])).toThrow(TypeError);
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

    test('failures() uses indices for nested arrays and is empty when passed', () => {
        const fence = base.each(base.min(2).build()).build();

        expect(
            fence
                .run(['ab', 'c', 'de'])
                .failures()
                .map((f) => f.path),
        ).toEqual([['each', '1', 'min']]);
        expect(fence.run(['ab', 'cd']).failures()).toEqual([]);
    });

    test('explain() reports the verdict, each step and nested results', () => {
        const text = userPolicy.run({ username: 'tim@example.com', password: 'short' }).explain();

        expect(text).toContain('subject: {username: "tim@example.com", password: "short"}');
        expect(text).toContain('FAILED (0/1 steps)');
        expect(text).toContain('[x] policy({username: Fence(4 steps), password: Fence(3 steps)})');
        expect(text).toContain('username:');
        expect(text).toContain('PASSED (4/4 steps)');
        expect(text).toContain('[✓] email');
        expect(text).toContain('[x] min(8)');
        expect(text.split('\n').every((line) => line.length < 100)).toBe(true);
    });

    test('toJSON() gives a plain description that survives JSON.stringify', () => {
        const json = JSON.parse(JSON.stringify(base.min(2).build().run('a'))) as unknown;

        expect(json).toEqual({
            subject: 'a',
            passed: false,
            outcomes: [{ name: 'min', args: [2], value: false }],
        });
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
