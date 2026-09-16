import fc from 'fast-check';
import { describe, expect, test } from 'vitest';

import { Fence, FenceBuilder, HydrationError, SerializationError } from '../src/index.js';
import * as v from './support/validators.js';

const base = FenceBuilder.create()
    .register('required', v.required)
    .register('min', v.minLength)
    .register('eq', v.strictEqual)
    .register('policy', v.policy)
    .register('each', v.each);

describe('toJSON', () => {
    test('a builder serializes to a single-encoded, versioned document', () => {
        const builder = base
            .required()
            .min(4)
            .eq({ nested: [1, 'two', null, true] });

        expect(builder.toJSON()).toEqual({
            fence: 2,
            steps: [
                { name: 'required', args: [] },
                { name: 'min', args: [4] },
                { name: 'eq', args: [{ nested: [1, 'two', null, true] }] },
            ],
        });
        expect(JSON.parse(JSON.stringify(builder))).toEqual(builder.toJSON());
        expect(JSON.stringify(builder.build())).toBe(JSON.stringify(builder));
    });

    test('nested fences are tagged', () => {
        const inner = base.min(2).build();
        const outer = base.policy({ name: inner }).each(inner);

        expect(outer.toJSON().steps).toEqual([
            {
                name: 'policy',
                args: [{ name: { $fence: { fence: 2, steps: [{ name: 'min', args: [2] }] } } }],
            },
            { name: 'each', args: [{ $fence: { fence: 2, steps: [{ name: 'min', args: [2] }] } }] },
        ]);
    });

    test.each([
        ['a function', () => true, /steps\[0\]\.args\[0\] is \[Function/],
        ['undefined', undefined, /is undefined/],
        ['NaN', NaN, /is NaN/],
        ['Infinity', Infinity, /is Infinity/],
        ['a bigint', 1n, /is 1/],
        ['a symbol', Symbol('s'), /is Symbol\(s\)/],
        ['a Date', new Date(0), /is \[object Date\]/],
        ['a Map', new Map(), /is \[object Map\]/],
        [
            'a class instance',
            new (class Thing {
                id = 1;
            })(),
            /is \[object Thing\]/,
        ],
        ['a nested function', { deep: [{ fn: () => 1 }] }, /args\[0\]\.deep\[0\]\.fn/],
        [
            'an anonymous class instance',
            new (class {
                id = 1;
            })(),
            /is \[object Object\]/,
        ],
        ['the reserved $fence key', { $fence: 1 }, /reserved key "\$fence"/],
    ])('refuses %s in step arguments', (_label, arg, message) => {
        const builder = base.eq(arg);

        expect(() => builder.toJSON()).toThrow(SerializationError);
        expect(() => JSON.stringify(builder)).toThrow(message);
    });
});

describe('fromJSON', () => {
    test('restores steps from an object or a JSON string against a base registry', () => {
        const builder = base.required().min(4);

        expect(FenceBuilder.fromJSON(builder.toJSON(), base).steps).toEqual(builder.steps);
        expect(FenceBuilder.fromJSON(JSON.stringify(builder), base).steps).toEqual(builder.steps);
    });

    test('the restored builder keeps the base registry and can be extended', () => {
        const restored = FenceBuilder.fromJSON(base.min(2).toJSON(), base);

        expect(restored.registry).toBe(base.registry);
        expect(restored.eq('ab').build().run('ab').passed).toBe(true);
    });

    test('nested fences are revived and run', () => {
        const inner = base.min(2).build();
        const policyFence = FenceBuilder.fromJSON(
            JSON.stringify(base.policy({ name: inner })),
            base,
        ).build();
        const eachFence = FenceBuilder.fromJSON(JSON.stringify(base.each(inner)), base).build();

        const [policyArg] = policyFence.steps[0]?.args ?? [];
        expect((policyArg as { name: unknown }).name).toBeInstanceOf(Fence);
        expect(policyFence.run({ name: 'ab' }).for('policy')).toMatchObject([
            { name: { passed: true } },
        ]);
        expect(
            policyFence
                .run({ name: 'a' })
                .failures()
                .map((f) => f.path),
        ).toEqual([['policy', 'name', 'min']]);
        expect(
            eachFence
                .run(['ab', 'c'])
                .failures()
                .map((f) => f.path),
        ).toEqual([['each', '1', 'min']]);
        expect(eachFence.run('not an array').passed).toBe(false);
    });

    test('lists every unregistered name at once', () => {
        const json = {
            fence: 2,
            steps: [
                { name: 'min', args: [1] },
                { name: 'a', args: [] },
                { name: 'b', args: [] },
                { name: 'a', args: [] },
            ],
        };
        const attempt = () => FenceBuilder.fromJSON(json, base);

        expect(attempt).toThrow(HydrationError);
        expect(attempt).toThrow(/unregistered validators: a, b/);
        try {
            attempt();
        } catch (error) {
            expect((error as HydrationError).missing).toEqual(['a', 'b']);
        }
    });

    test('lists unregistered names inside nested fences together with top-level ones', () => {
        const nested = {
            $fence: {
                fence: 2,
                steps: [
                    { name: 'zzz', args: [] },
                    { name: 'min', args: [1] },
                ],
            },
        };
        const json = {
            fence: 2,
            steps: [
                { name: 'top', args: [] },
                { name: 'each', args: [nested] },
                { name: 'policy', args: [{ shape: { inner: nested, list: [nested] } }] },
            ],
        };

        try {
            FenceBuilder.fromJSON(json, base);
            expect.unreachable();
        } catch (error) {
            expect(error).toBeInstanceOf(HydrationError);
            expect((error as HydrationError).missing).toEqual(['top', 'zzz']);
        }
    });

    test.each([
        ['invalid JSON text', '{not json', /not valid JSON/],
        ['a non-object', 42, /must be an object/],
        ['null', null, /must be an object/],
        ['a missing version', { steps: [] }, /Unsupported serialized fence version undefined/],
        ['a v1-looking array', ['{"_name":"min"}'], /must be an object/],
        ['a wrong version', { fence: 1, steps: [] }, /version 1/],
        ['non-array steps', { fence: 2, steps: {} }, /"steps" must be an array/],
        ['a non-object step', { fence: 2, steps: [1] }, /steps\[0\] must be an object/],
        ['a step without a name', { fence: 2, steps: [{ args: [] }] }, /steps\[0\]\.name/],
        ['a step without args', { fence: 2, steps: [{ name: 'min' }] }, /steps\[0\]\.args/],
        [
            'a bad nested fence',
            { fence: 2, steps: [{ name: 'each', args: [{ $fence: { fence: 3 } }] }] },
            /version 3/,
        ],
    ])('rejects %s', (_label, input, message) => {
        expect(() => FenceBuilder.fromJSON(input, base)).toThrow(HydrationError);
        expect(() => FenceBuilder.fromJSON(input, base)).toThrow(message);
    });

    test('an invalid JSON string carries the parse error as cause', () => {
        try {
            FenceBuilder.fromJSON('{', base);
        } catch (error) {
            expect((error as HydrationError).cause).toBeInstanceOf(SyntaxError);
            expect((error as HydrationError).missing).toEqual([]);
        }
    });
});

describe('fromLegacyJSON', () => {
    const legacy = JSON.stringify([
        JSON.stringify({ _name: 'required', _args: [], _memoize: false }),
        JSON.stringify({ _name: 'min', _args: [4], _memoize: false }),
    ]);

    test('reads the v1 double-encoded format', () => {
        const restored = FenceBuilder.fromLegacyJSON(legacy, base);

        expect(restored.steps).toEqual([
            { name: 'required', args: [] },
            { name: 'min', args: [4] },
        ]);
        expect(restored.build().run('abcd').passed).toBe(true);
    });

    test('tolerates already-parsed inner objects and missing _args', () => {
        const restored = FenceBuilder.fromLegacyJSON(JSON.stringify([{ _name: 'required' }]), base);

        expect(restored.steps).toEqual([{ name: 'required', args: [] }]);
    });

    test.each([
        ['invalid JSON', '[', /not valid JSON/],
        ['a non-array', '{}', /must be a JSON array/],
        ['a step without _name', '["{}"]', /missing "_name"/],
        ['unregistered names', JSON.stringify([JSON.stringify({ _name: 'zzz' })]), /zzz/],
    ])('rejects %s', (_label, input, message) => {
        expect(() => FenceBuilder.fromLegacyJSON(input, base)).toThrow(HydrationError);
        expect(() => FenceBuilder.fromLegacyJSON(input, base)).toThrow(message);
    });
});

describe('round trips (property based)', () => {
    const jsonArg = fc
        .jsonValue({ maxDepth: 3 })
        .filter((value) => !JSON.stringify(value).includes('$fence'));

    test('any JSON arguments survive stringify -> fromJSON -> toJSON', () => {
        fc.assert(
            fc.property(
                fc.array(fc.array(jsonArg, { maxLength: 3 }), { minLength: 1, maxLength: 5 }),
                (argLists) => {
                    let builder = base as FenceBuilder<typeof base.registry>;
                    for (const args of argLists) {
                        builder = builder.step('eq', ...(args as [unknown]));
                    }
                    const restored = FenceBuilder.fromJSON(JSON.stringify(builder), base);

                    expect(JSON.stringify(restored)).toBe(JSON.stringify(builder));
                    expect(restored.steps.length).toBe(argLists.length);
                },
            ),
        );
    });

    test('nested fences of arbitrary depth survive a round trip and behave identically', () => {
        const { fence } = fc.letrec<{ fence: Fence }>((tie) => ({
            fence: fc.oneof(
                { depthSize: 'small', withCrossShrink: true },
                fc.integer({ min: 0, max: 4 }).map((n) => base.min(n).build()),
                fc
                    .array(tie('fence'), { minLength: 1, maxLength: 3 })
                    .map((inner) => base.each(inner[0] ?? base.min(0).build()).build()),
                fc
                    .dictionary(fc.stringMatching(/^[a-z]{1,4}$/), tie('fence'), {
                        minKeys: 1,
                        maxKeys: 3,
                    })
                    .map((shape) => base.policy(shape).build()),
            ),
        }));

        fc.assert(
            fc.property(
                fence,
                fc.oneof(
                    fc.string({ maxLength: 6 }),
                    fc.array(fc.string({ maxLength: 6 }), { maxLength: 3 }),
                    fc.dictionary(fc.stringMatching(/^[a-z]{1,4}$/), fc.string({ maxLength: 6 })),
                ),
                (original, subject) => {
                    const restored = FenceBuilder.fromJSON(JSON.stringify(original), base).build();

                    expect(JSON.stringify(restored)).toBe(JSON.stringify(original));
                    expect(JSON.stringify(restored.run(subject))).toBe(
                        JSON.stringify(original.run(subject)),
                    );
                },
            ),
        );
    });
});
