import Invokable from '../Invokable';

/** @test {Invokable} */
describe(`Invokable`, function () {
    test(`Invokable empty constructor`, () => {
        expect(() => new Invokable()).toThrow();
    });

    test(`Invokable no fn`, () => {
        expect(() => new Invokable(null, `name`, [], true)).toThrow();
    });

    test(`Invokable anonymous fn no name`, () => {
        expect(() => new Invokable(() => true)).toThrow();
    });

    test(`Invokable bad args`, () => {
        expect(() => new Invokable(() => true, `name`, `string`)).toThrow();
    });

    test(`Invokable bad memoize`, () => {
        expect(() => new Invokable(() => true, `name`, [], null)).toThrow();
    });

    test(`Invokable anonymous fn with name is created`, () => {
        expect(new Invokable(() => true, `name`)).toBeInstanceOf(Invokable);
    });

    test(`Invokable anonymous fn with name has correct name property`, () => {
        const name = `name`;
        const invokable = new Invokable(() => true, name);
        expect(invokable._name).toEqual(name);
    });

    test(`Invokable named fn with no name has correct name property`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn);
        expect(invokable._name).toEqual(`fn`);
    });

    test(`Invokable named fn with name has correct name property`, () => {
        const fn = () => true;
        const name = `name`;
        const invokable = new Invokable(fn, name);
        expect(invokable._name).toEqual(name);
    });

    test(`Invokable default properties`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn);

        expect(invokable).toHaveProperty(`_name`, `fn`);
        expect(invokable).toHaveProperty(`_args`, []);
        expect(invokable).toHaveProperty(`_memoize`, false);
        expect(invokable).not.toHaveProperty(`_cache`);
        expect(invokable).not.toHaveProperty(`_memoizedFn`);
    });

    test(`Invokable memoized instantiates`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn, null, [], true);

        expect(invokable).toHaveProperty(`_name`, `fn`);
        expect(invokable).toHaveProperty(`_args`, []);
        expect(invokable).toHaveProperty(`_memoize`, true);
        expect(invokable).toHaveProperty(`_memoizedFn`);
    });

    test(`Invokable can be invoked`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn);

        expect(invokable.invoke()).toEqual(true);
    });

    test(`Invokable memoized can be invoked`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn, null, [], true);

        expect(invokable.invoke()).toEqual(true);
    });

    test(`Invokable memoized use 'none' key when no arguments`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn, null, [], true);

        expect(invokable.invoke()).toEqual(true);
        expect(invokable._cache).toHaveProperty(`none`, true);
    });

    test(`Invokable memoized use first argument key`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn, null, [], true);

        expect(invokable.invoke(`a`)).toEqual(true);
        expect(invokable._cache).toHaveProperty(`a`, true);
    });

    test(`Invokable memoized doesn't call function with same args more than once`, () => {
        const counter = jest.fn();
        const fn = () => { counter(); return true; };
        const invokable = new Invokable(fn, null, [], true);

        invokable.invoke(`a`);
        invokable.invoke(`a`);
        invokable.invoke(`b`);
        expect(counter).toHaveBeenCalledTimes(2);

        invokable.dememoize();
        invokable.invoke(`a`);
        invokable.invoke(`a`);
        expect(counter).toHaveBeenCalledTimes(4);
    });

    test(`Invokable dememoized clears properties`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn, null, [], true);

        invokable.invoke(`a`);
        expect(invokable).toHaveProperty(`_memoize`, true);
        expect(invokable).toHaveProperty(`_cache`);
        expect(invokable).toHaveProperty(`_memoizedFn`);
        expect(invokable._cache).toHaveProperty(`a`, true);

        invokable.dememoize();

        expect(invokable).toHaveProperty(`_memoize`, false);
        expect(invokable).not.toHaveProperty(`_cache`);
        expect(invokable).not.toHaveProperty(`_memoizedFn`);
    });

    test(`Invokable serialize is stringified correctly`, () => {
        const fn = () => true;
        const invokable = new Invokable(fn, null, [], false);
        const parsed = JSON.parse(invokable.serialize());

        expect(parsed).toHaveProperty(`_name`, `fn`);
        expect(parsed).toHaveProperty(`_args`, []);
        expect(parsed).toHaveProperty(`_memoize`, false);
    });
});
