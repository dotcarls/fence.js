import { describe, expect, test, vi } from 'vitest';

import { Invokable, Result } from '../src/index.js';

describe('Result', () => {
    test('constructor guards', () => {
        expect(() => new Result()).toThrow();
        // @ts-expect-error -- exercising the runtime guard
        expect(() => new Result(null, [])).toThrow();
        // @ts-expect-error -- exercising the runtime guard
        expect(() => new Result([], null)).toThrow();
        expect(() => new Result([], [])).toThrow();
        expect(() => new Result([true], [])).toThrow();
        expect(() => new Result([null], [null, null])).toThrow();
    });

    test('forAll', () => {
        expect(new Result([null, null, null], [true, true, true]).forAll()).toBe(true);
        expect(new Result([null, null, null], [true, false, true]).forAll()).toBe(false);
        expect(() => new Result([null], [[true]]).forAll()).toThrow();

        const passing = new Result([null], [true]);
        expect(new Result([null], [[passing]]).forAll()).toBe(true);

        const mixed = new Result([null, false], [true, false]);
        expect(new Result([null, null], [true, [mixed]]).forAll()).toBe(false);
    });

    test('forAny', () => {
        expect(new Result([null, null, null], [true, true, true]).forAny()).toBe(true);
        expect(new Result([null, null, null], [true, false, true]).forAny()).toBe(true);
        expect(new Result([null, null, null], [false, false, false]).forAny()).toBe(false);
        expect(() => new Result([null], [[true]]).forAny()).toThrow();

        const passing = new Result([null], [true]);
        expect(new Result([null], [[passing]]).forAny()).toBe(true);

        const mixed = new Result([null, false], [true, false]);
        expect(new Result([null, null], [true, [mixed]]).forAny()).toBe(true);

        const failing = new Result([null, false], [false, false]);
        expect(new Result([null, null], [false, [failing]]).forAny()).toBe(false);
    });

    test('forOne', () => {
        const bad = new Result([null], [false]);
        // @ts-expect-error -- exercising the runtime guard
        expect(() => bad.forOne()).toThrow();
        expect(() => bad.forOne('')).toThrow();
        expect(() => bad.forOne('fn')).toThrow();

        const invokable = new Invokable(() => true, 'fn');
        const result = new Result([invokable], [invokable.invoke()]);
        expect(result.forOne('fn')).toEqual([true]);
    });

    test('explain defaults to console.log and marks failures', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const result = new Result([new Invokable(() => false, 'no')], [false], 'x');

        result.explain();

        const out = spy.mock.calls.map((parts) => parts.join(' ')).join('\n');
        spy.mockRestore();
        expect(out).toContain('[x] forAll');
        expect(out).toContain('[x] no');
    });

    test('explain writes to the supplied logger', () => {
        const lines: string[] = [];
        const inner = new Result([new Invokable(() => true, 'inner')], [true], 'x');
        const result = new Result(
            [new Invokable(() => true, 'eq', ['a']), new Invokable(() => [inner], 'nested')],
            [true, [inner]],
            ['a'],
        );

        result.explain((...parts) => lines.push(parts.join(' ')));

        expect(lines.join('\n')).toContain('[✓] eq (["a"])');
        expect(lines.join('\n')).toContain('[✓] inner');
    });
});
