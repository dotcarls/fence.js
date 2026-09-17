import { describe, expectTypeOf, test } from 'vitest';

import {
    Fence,
    FenceBuilder,
    type EmptyRegistry,
    type Fluent,
    type Registry,
    type Result,
} from '../src/index.js';

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

// A type alias, not an interface: interfaces have no implicit index signature and so do not
// satisfy Registry.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type BaseRegistry = {
    readonly string: typeof isString;
    readonly min: typeof min;
    readonly between: typeof between;
    readonly policy: typeof policy;
};

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
        expectTypeOf(base.min(1).string()).toEqualTypeOf<Fluent<BaseRegistry>>();
        expectTypeOf(base.build()).toEqualTypeOf<Fence<BaseRegistry>>();
        expectTypeOf(base.build().registry).toEqualTypeOf<BaseRegistry>();
    });

    test('step() is typed by name', () => {
        expectTypeOf<Parameters<typeof base.step>[0]>().toEqualTypeOf<
            'string' | 'min' | 'between' | 'policy'
        >();
        expectTypeOf(base.step('min', 1)).toEqualTypeOf(base);
    });

    test('reject wrong arguments and unknown names', () => {
        // @ts-expect-error -- min takes a number
        base.min('3');
        // @ts-expect-error -- string takes no arguments
        base.string(1);
        // @ts-expect-error -- not registered
        base.step('nope');
        // @ts-expect-error -- wrong arity
        base.step('min');
        // @ts-expect-error -- validators must return an Outcome
        base.register('bad', () => 'yes');
        // @ts-expect-error -- async validators are not outcomes
        base.register('later', () => Promise.resolve(true));
        // @ts-expect-error -- validators are called without a `this`
        base.register('withThis', function (this: { x: number }, v: unknown) {
            return this.x === v;
        });
    });

    test('explain reserved, duplicate and union names in the error', () => {
        // @ts-expect-error -- "'build' is reserved: it would shadow a builder or Object member"
        base.register('build', isString);
        // @ts-expect-error -- "'then' is reserved: it would shadow a builder or Object member"
        base.register('then', isString);
        // @ts-expect-error -- "'toString' is reserved: it would shadow a builder or Object member"
        base.register('toString', isString);
        // @ts-expect-error -- "'min' is already registered"
        base.register('min', min);
        const either = 'a' as 'a' | 'b';
        // @ts-expect-error -- "Register one name at a time, not a union of names"
        base.register(either, isString);
        // @ts-expect-error -- reserved key in a record
        base.registerAll({ ok: isString, then: isString });
        // @ts-expect-error -- duplicate key in a record
        base.registerAll({ min });
    });

    test('a non-literal name widens the registry instead of mistyping existing methods', () => {
        const dynamic = 'x' as string;
        const wide = base.register(dynamic, min);

        expectTypeOf(wide).toEqualTypeOf<Fluent<Registry>>();
        expectTypeOf(wide.registry).toEqualTypeOf<Registry>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the wide case is `any` by design
        expectTypeOf<Fluent<Registry>[string]>().parameters.toEqualTypeOf<any[]>();
        expectTypeOf(wide.anything?.(1, 'two')).toEqualTypeOf<Fluent<Registry> | undefined>();
        expectTypeOf(wide.step('anything', 1, 'two')).toEqualTypeOf<Fluent<Registry>>();
        expectTypeOf(base.registerAll({} as Record<string, typeof min>)).toEqualTypeOf<
            Fluent<Registry>
        >();
        // Once wide, a registry stays wide.
        expectTypeOf(wide.register('exact', min)).toEqualTypeOf<Fluent<Registry>>();
        expectTypeOf(wide.registerAll({ exact: min })).toEqualTypeOf<Fluent<Registry>>();
    });

    test('registry, entries and steps are exposed with precise types', () => {
        expectTypeOf(base.registry).toEqualTypeOf<BaseRegistry>();
        expectTypeOf(FenceBuilder.create().registry).toEqualTypeOf<EmptyRegistry>();
        expectTypeOf(
            base.registerAll(FenceBuilder.create().register('eq', min)).registry,
        ).toEqualTypeOf<{
            readonly string: typeof isString;
            readonly min: typeof min;
            readonly between: typeof between;
            readonly policy: typeof policy;
            readonly eq: typeof min;
        }>();
    });

    test('fromJSON accepts a builder or a registry and returns a builder typed by it', () => {
        expectTypeOf(FenceBuilder.fromJSON({}, base)).toEqualTypeOf(base);
        expectTypeOf(FenceBuilder.fromJSON({}, base.registry)).toEqualTypeOf(base);
        expectTypeOf(FenceBuilder.fromLegacyJSON('', base.registry)).toEqualTypeOf(base);
    });

    test('generic code can accept any builder', () => {
        const stepNames = <R extends Registry>(builder: FenceBuilder<R>): string[] =>
            builder.steps.map((step) => step.name);
        expectTypeOf(stepNames(base)).toEqualTypeOf<string[]>();
        expectTypeOf(stepNames(FenceBuilder.create())).toEqualTypeOf<string[]>();
    });
});

describe('review follow-ups', () => {
    test('registerAll rejects a builder with an overlapping name', () => {
        const other = FenceBuilder.create().register('min', min).register('extra', isString);
        // @ts-expect-error -- "'min' is already registered"
        base.registerAll(other);
        expectTypeOf(
            base.registerAll(FenceBuilder.create().register('extra', isString)).extra,
        ).toBeFunction();
    });

    test('the constructor does not accept an explicit registry type argument', () => {
        expectTypeOf(new FenceBuilder()).toEqualTypeOf<FenceBuilder>();
        // @ts-expect-error -- an explicit registry would promise methods the instance lacks
        new FenceBuilder<{ readonly min: typeof min }>();
    });

    test('legacy Object.prototype accessors are reserved names too', () => {
        // @ts-expect-error -- "'__defineGetter__' is reserved: ..."
        base.register('__defineGetter__', isString);
    });

    test('fromJSON with a plain registry is typed by that registry', () => {
        expectTypeOf(FenceBuilder.fromJSON({}, { min }).min).parameters.toEqualTypeOf<
            [n: number]
        >();
    });
});
