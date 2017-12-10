import FenceBuilder from '../FenceBuilder';
import Invokable from '../Invokable';

describe(`FenceBuilder`, function () {
    test(`FenceBuilder bad arguments`, () => {
        expect(() => new FenceBuilder(null, [])).toThrow();
    });

    test(`Invokable serialize is stringified correctly`, () => {
        const FB = new FenceBuilder();
        const fb = FB.fork().register(() => true, `fn`);
        const invokable = new Invokable(() => true, `fn`);

        const parsedFb = JSON.parse(fb.fork().fn().serialize());
        const parsedInvokable = JSON.parse(invokable.serialize());

        expect(JSON.parse(parsedFb[0])).toEqual(parsedInvokable);
    });

    test(`Invokable serialize is hydrated correctly`, () => {
        const fn = () => true;
        const FB = new FenceBuilder();
        const fb = FB.fork().register(fn);

        const serialized = fb.fork().serialize();
        const hydrated = (new FenceBuilder()).fork().register(fn).fork().hydrate(serialized);

        expect(fb.fork()).toMatchObject(hydrated);
    });

    // test(`Invokable serialize bad hydrate`, () => {
    //     const fn = () => true;
    //     const FB1 = new FenceBuilder();
    //     const FB2 = new FenceBuilder();
    //     const fb = FB1.fork();
    //     const serialized = FB2.fork().register(fn).serialize();
    //
    //     expect(() => fb.hydrate(serialized)).toThrow();
    // });
});
