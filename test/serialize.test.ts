import fc from 'fast-check';
import { describe, expect, test } from 'vitest';

import {
    FORMAT_VERSION,
    Fence,
    FenceBuilder,
    HydrationError,
    NESTED_FENCE_KEY,
    SerializationError,
} from '../src/index.js';
import * as v from './support/validators.js';

const base = FenceBuilder.create()
    .register('required', v.required)
    .register('min', v.minLength)
    .register('eq', v.strictEqual)
    .register('policy', v.policy)
    .register('each', v.each);

const hydrationError = (message: RegExp, missing: string[] = []): Error =>
    expect.objectContaining({
        name: 'HydrationError',
        message: expect.stringMatching(message) as string,
        missing,
    }) as Error;

describe('toJSON', () => {
    test('exports the format constants', () => {
        expect(FORMAT_VERSION).toBe(2);
        expect(NESTED_FENCE_KEY).toBe('$fence');
    });

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

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    // eslint-disable-next-line no-sparse-arrays -- the hole is the point
    const sparse = [1, , 3];

    test.each([
        ['a function', () => true, /steps\[0\]\.args\[0\] is \[Function/],
        ['undefined inside an array', [undefined], /args\[0\]\[0\] is undefined/],
        ['NaN', NaN, /is NaN/],
        ['Infinity', Infinity, /is Infinity/],
        ['a bigint', 1n, /is 1n;/],
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
        [
            'an anonymous class instance',
            new (class {
                id = 1;
            })(),
            /is \[object Object\]/,
        ],
        ['a nested function', { deep: [{ fn: () => 1 }] }, /args\[0\]\.deep\[0\]\.fn/],
        ['a sparse array', sparse, /args\[0\]\[1\] is undefined/],
        ['a cyclic object', cyclic, /args\[0\]\.self is circular/],
        ['the reserved $fence key', { $fence: 1 }, /reserved key "\$fence"/],
    ])('refuses %s in step arguments', (_label, arg, message) => {
        const builder = base.eq(arg);

        expect(() => builder.toJSON()).toThrow(SerializationError);
        expect(() => JSON.stringify(builder)).toThrow(message);
    });
});

describe('fromJSON', () => {
    test('restores steps from an object or a JSON string against a base builder or registry', () => {
        const builder = base.required().min(4);

        expect(FenceBuilder.fromJSON(builder.toJSON(), base).steps).toEqual(builder.steps);
        expect(FenceBuilder.fromJSON(JSON.stringify(builder), base).steps).toEqual(builder.steps);
        expect(FenceBuilder.fromJSON(builder.toJSON(), base.registry).steps).toEqual(builder.steps);
        expect(
            FenceBuilder.fromJSON(builder.toJSON(), base.registry).build().run('abcd').passed,
        ).toBe(true);
    });

    test('the restored builder keeps the base registry and options and can be extended', () => {
        const memo = FenceBuilder.create().register('min', v.minLength, { memoize: true });
        const restored = FenceBuilder.fromJSON(memo.min(2).toJSON(), memo);

        expect(restored.registry).toBe(memo.registry);
        expect(restored.entries.get('min')?.options).toEqual({ memoize: true });
        expect(restored.min(3).build().run('abc').passed).toBe(true);
    });

    test('an empty document restores an empty builder', () => {
        expect(FenceBuilder.fromJSON({ fence: 2, steps: [] }, base).steps).toEqual([]);
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

    test('rejects an unusable base', () => {
        expect(() => FenceBuilder.fromJSON({ fence: 2, steps: [] }, null as never)).toThrow(
            TypeError,
        );
    });

    test('lists every unregistered name at once, nested fences included', () => {
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
                { name: 'min', args: [1] },
                { name: 'top', args: [] },
                { name: 'each', args: [nested] },
                { name: 'policy', args: [{ shape: { inner: nested, list: [nested] } }] },
                { name: 'top', args: [] },
            ],
        };

        expect(() => FenceBuilder.fromJSON(json, base)).toThrow(HydrationError);
        expect(() => FenceBuilder.fromJSON(json, base)).toThrow(
            hydrationError(/unregistered validators: top, zzz/, ['top', 'zzz']),
        );
    });

    test('does not pollute prototypes through hostile keys', () => {
        // Written as text: in an object literal, `__proto__:` would set the prototype instead.
        const json =
            '{"fence":2,"steps":[{"name":"eq","args":[{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}]},' +
            '{"name":"eq","args":[{"$fence":{"fence":2,"steps":[{"name":"min","args":[1]}]}}]}]}';
        const restored = FenceBuilder.fromJSON(json, base);
        const [arg] = restored.steps[0]?.args ?? [];

        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        expect(Object.getPrototypeOf(arg)).toBe(Object.prototype);
        expect(Object.hasOwn(arg as object, '__proto__')).toBe(true);
        expect(restored.steps[1]?.args[0]).toBeInstanceOf(Fence);
    });

    // eslint-disable-next-line no-sparse-arrays -- the hole is the point
    const sparseArgs = [[1, , 2]];

    test.each([
        ['invalid JSON text', '{not json', /not valid JSON/],
        ['a non-object', 42, /must be a plain object/],
        ['null', null, /must be a plain object/],
        ['a missing version', { steps: [] }, /unsupported version undefined/],
        [
            'v1 output',
            ['{"_name":"min"}'],
            /looks like v1 serialize\(\) output; use FenceBuilder.fromLegacyJSON/,
        ],
        ['a wrong version', { fence: 1, steps: [] }, /version 1/],
        ['non-array steps', { fence: 2, steps: {} }, /\.steps must be an array/],
        ['a non-object step', { fence: 2, steps: [1] }, /steps\[0\] must be a plain object/],
        ['a step without a name', { fence: 2, steps: [{ args: [] }] }, /steps\[0\]\.name/],
        ['a step without args', { fence: 2, steps: [{ name: 'min' }] }, /steps\[0\]\.args/],
        [
            'a function argument',
            { fence: 2, steps: [{ name: 'eq', args: [() => 1] }] },
            /args\[0\] is \[Function/,
        ],
        [
            'a Date argument',
            { fence: 2, steps: [{ name: 'eq', args: [new Date(0)] }] },
            /args\[0\] is \[object Date\]/,
        ],
        ['a NaN argument', { fence: 2, steps: [{ name: 'eq', args: [NaN] }] }, /args\[0\] is NaN/],
        [
            'a sparse argument array',
            { fence: 2, steps: [{ name: 'eq', args: sparseArgs }] },
            /args\[0\]\[1\] is undefined/,
        ],
        [
            'a nested non-JSON value',
            { fence: 2, steps: [{ name: 'eq', args: [{ a: [{ b: undefined }] }] }] },
            /args\[0\]\.a\[0\]\.b is undefined/,
        ],
        [
            'a bad nested fence',
            { fence: 2, steps: [{ name: 'each', args: [{ $fence: { fence: 3 } }] }] },
            /args\[0\]\.\$fence has unsupported version 3/,
        ],
        [
            'an empty nested fence',
            { fence: 2, steps: [{ name: 'each', args: [{ $fence: { fence: 2, steps: [] } }] }] },
            /nested fence with no steps/,
        ],
        [
            'a $fence tag with extra keys',
            {
                fence: 2,
                steps: [
                    {
                        name: 'each',
                        args: [
                            { $fence: { fence: 2, steps: [{ name: 'min', args: [1] }] }, extra: 1 },
                        ],
                    },
                ],
            },
            /mixes "\$fence" with other keys/,
        ],
    ])('rejects %s', (_label, input, message) => {
        expect(() => FenceBuilder.fromJSON(input, base)).toThrow(HydrationError);
        expect(() => FenceBuilder.fromJSON(input, base)).toThrow(hydrationError(message));
    });

    test('an invalid JSON string carries the parse error as cause', () => {
        expect(() => FenceBuilder.fromJSON('{', base)).toThrow(
            expect.objectContaining({
                name: 'HydrationError',
                missing: [],
                cause: expect.any(SyntaxError) as SyntaxError,
            }) as Error,
        );
    });
});

describe('fromLegacyJSON', () => {
    const legacy = JSON.stringify([
        JSON.stringify({ _name: 'required', _args: [], _memoize: false }),
        JSON.stringify({ _name: 'min', _args: [4], _memoize: false }),
    ]);

    test('reads the v1 double-encoded format against a builder or a registry', () => {
        const restored = FenceBuilder.fromLegacyJSON(legacy, base);

        expect(restored.steps).toEqual([
            { name: 'required', args: [] },
            { name: 'min', args: [4] },
        ]);
        expect(restored.build().run('abcd').passed).toBe(true);
        expect(FenceBuilder.fromLegacyJSON(legacy, base.registry).steps).toEqual(restored.steps);
    });

    test('tolerates already-parsed inner objects and missing _args', () => {
        const restored = FenceBuilder.fromLegacyJSON(JSON.stringify([{ _name: 'required' }]), base);

        expect(restored.steps).toEqual([{ name: 'required', args: [] }]);
    });

    test.each([
        ['invalid JSON', '[', /not valid JSON/],
        ['a non-array', '{}', /must be a JSON array/],
        ['a malformed inner string', '["{not json"]', /Legacy step 0 is not valid JSON/],
        ['a step without _name', '["{}"]', /missing "_name"/],
        [
            'a $fence tag with extra keys',
            JSON.stringify([{ _name: 'eq', _args: [{ $fence: {}, x: 1 }] }]),
            /mixes "\$fence"/,
        ],
        ['unregistered names', JSON.stringify([JSON.stringify({ _name: 'zzz' })]), /zzz/],
    ])('rejects %s', (_label, input, message) => {
        expect(() => FenceBuilder.fromLegacyJSON(input, base)).toThrow(HydrationError);
        expect(() => FenceBuilder.fromLegacyJSON(input, base)).toThrow(message);
    });

    test('a malformed inner string carries the parse error as cause', () => {
        expect(() => FenceBuilder.fromLegacyJSON('["{"]', base)).toThrow(
            expect.objectContaining({
                name: 'HydrationError',
                cause: expect.any(SyntaxError) as SyntaxError,
            }) as Error,
        );
    });
});

describe('round trips (property based)', () => {
    const jsonArg = fc
        .jsonValue({ maxDepth: 3 })
        .filter((value) => !JSON.stringify(value).includes('$fence'));

    test('any JSON arguments survive stringify -> fromJSON, judged against JSON itself', () => {
        fc.assert(
            fc.property(
                fc.array(fc.array(jsonArg, { maxLength: 3 }), { minLength: 1, maxLength: 5 }),
                (argLists) => {
                    let builder = base as FenceBuilder<typeof base.registry>;
                    for (const args of argLists) {
                        builder = builder.step('eq', ...(args as [unknown]));
                    }
                    const restored = FenceBuilder.fromJSON(JSON.stringify(builder), base);

                    // The oracle is JSON.parse(JSON.stringify(...)) of the original arguments, which
                    // does not involve the serializer under test.
                    expect(restored.steps.map((step) => step.args)).toEqual(
                        JSON.parse(JSON.stringify(argLists)),
                    );
                    expect(restored.steps.map((step) => step.name)).toEqual(
                        argLists.map(() => 'eq'),
                    );
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
        const subject = fc.oneof(
            fc.string({ maxLength: 6 }),
            fc.array(fc.string({ maxLength: 6 }), { maxLength: 3 }),
            fc.dictionary(fc.stringMatching(/^[a-z]{1,4}$/), fc.string({ maxLength: 6 })),
        );

        fc.assert(
            fc.property(fence, subject, (original, value) => {
                const restored = FenceBuilder.fromJSON(JSON.stringify(original), base).build();

                expect(restored.steps).toEqual(original.steps);
                expect(restored.run(value).toJSON()).toEqual(original.run(value).toJSON());
                expect(restored.run(value).passed).toBe(original.run(value).passed);
            }),
        );
    });
});
