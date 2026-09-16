import { describe, expect, test } from 'vitest';

import { FenceBuilder, Invokable } from '../src/index.js';

describe('FenceBuilder', () => {
    test('constructor rejects non-array arguments', () => {
        // @ts-expect-error -- exercising the runtime guard
        expect(() => new FenceBuilder(null, [])).toThrow();
    });

    test('serialize matches Invokable.serialize', () => {
        const fb = new FenceBuilder().fork().register(() => true, 'fn');
        const invokable = new Invokable(() => true, 'fn');

        const parsedFb = JSON.parse(fb.fork().fn!().serialize()) as string[];
        const parsedInvokable = JSON.parse(invokable.serialize()) as object;

        expect(JSON.parse(parsedFb[0]!)).toEqual(parsedInvokable);
    });

    test('serialize round-trips through hydrate', () => {
        const fn = () => true;
        const fb = new FenceBuilder().fork().register(fn);

        const serialized = fb.fork().serialize();
        const hydrated = new FenceBuilder().fork().register(fn).fork().hydrate(serialized);

        expect(fb.fork()).toMatchObject(hydrated);
    });

    test('hydrate rebuilds recorded steps from the registered names', () => {
        const eq = (v: unknown, other: unknown) => v === other;
        const base = new FenceBuilder().register(eq, 'eq');
        const serialized = base.fork().eq!('a').eq!('b').serialize();

        const hydrated = base.fork().hydrate(serialized);
        expect(hydrated._invokables.map((i) => i._args)).toEqual([['a'], ['b']]);
        expect(hydrated.build().run('b').forOne('eq')).toEqual([false, true]);
    });

    test('hydrate throws for unknown step names', () => {
        const serialized = JSON.stringify([
            JSON.stringify({ _name: 'neverRegistered', _args: [] }),
        ]);
        expect(() => new FenceBuilder().hydrate(serialized)).toThrow(/neverRegistered/);
    });

    test('a built fence runs the recorded steps in order', () => {
        const fence = new FenceBuilder()
            .register((v: unknown, other: unknown) => v === other, 'eq')
            .fork().eq!('a').eq!('b').build();

        const result = fence.run('a');
        expect(result.forAll()).toBe(false);
        expect(result.forAny()).toBe(true);
        expect(result.forOne('eq')).toEqual([true, false]);
    });
});
