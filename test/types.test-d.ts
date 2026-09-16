import { describe, expectTypeOf, test } from 'vitest';

import { Fence, FenceBuilder, type EmptyRegistry, type Fluent, type Result } from '../src/index.js';

const isString = (v: unknown): v is string => typeof v === 'string';
const min = (v: string, n: number) => v.length >= n;
const between = (v: number, lo: number, hi?: number) => v >= lo && (hi === undefined || v <= hi);
const policy = (entity: unknown, shape: Record<string, Fence>) =>
    Object.fromEntries(Object.entries(shape).map(([k, f]) => [k, f.run(entity)])) as Record<
        string,
        Result
    >;

const base = FenceBuilder.create()
    .register('string', isString)
    .register('min', min)
    .register('between', between)
    .registerAll({ policy });

describe('fluent method types', () => {
    test('are inferred from the validator parameters after the subject', () => {
        expectTypeOf(base.string).parameters.toEqualTypeOf<[]>();
        expectTypeOf(base.min).parameters.toEqualTypeOf<[n: number]>();
        expectTypeOf(base.between).parameters.toEqualTypeOf<
            [lo: number, hi?: number | undefined]
        >();
        expectTypeOf(base.policy).parameters.toEqualTypeOf<[shape: Record<string, Fence>]>();
    });

    test('return a builder of the same registry', () => {
        expectTypeOf(base.min(1)).toEqualTypeOf(base);
        expectTypeOf(base.min(1).string()).toEqualTypeOf<Fluent<typeof base.registry>>();
        expectTypeOf(base.build()).toEqualTypeOf<Fence<typeof base.registry>>();
    });

    test('step() is typed by name', () => {
        expectTypeOf<Parameters<typeof base.step>[0]>().toEqualTypeOf<
            'string' | 'min' | 'between' | 'policy'
        >();
        expectTypeOf(base.step('min', 1)).toEqualTypeOf(base);
    });

    test('reject wrong arguments and unknown or reserved names', () => {
        // @ts-expect-error -- min takes a number
        base.min('3');
        // @ts-expect-error -- string takes no arguments
        base.string(1);
        // @ts-expect-error -- not registered
        base.step('nope');
        // @ts-expect-error -- reserved: would shadow build()
        base.register('build', isString);
        // @ts-expect-error -- reserved: would make the builder thenable
        base.register('then', isString);
        // @ts-expect-error -- validators must return an Outcome
        base.register('bad', () => 'yes');
    });

    test('registry and steps are exposed with precise types', () => {
        expectTypeOf(base.registry).toEqualTypeOf<{
            string: typeof isString;
            min: typeof min;
            between: typeof between;
            policy: typeof policy;
        }>();
        expectTypeOf(FenceBuilder.create().registry).toEqualTypeOf<EmptyRegistry>();
    });

    test('fromJSON returns a builder typed by the base registry', () => {
        expectTypeOf(FenceBuilder.fromJSON({}, base)).toEqualTypeOf(base);
    });
});
