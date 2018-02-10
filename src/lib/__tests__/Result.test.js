/* eslint-env node, jest */

import Result from '../Result';
import Invokable from '../Invokable';

/** @test {Result} */
describe('Result', () => {
    test('Result empty constructor', () => {
        expect(() => new Result()).toThrow();
    });

    test('Result no invokables', () => {
        expect(() => new Result(null, [])).toThrow();
    });

    test('Result no results', () => {
        expect(() => new Result([], null)).toThrow();
    });

    test('Result null invokables and results', () => {
        expect(() => new Result(null, null)).toThrow();
    });

    test('Result empty invokables and results', () => {
        expect(() => new Result([], [])).toThrow();
    });

    test('Result invokables and empty results', () => {
        expect(() => new Result([true], [])).toThrow();
    });

    test('Result mismatched invokables and results', () => {
        expect(() => new Result([null], [null, null])).toThrow();
    });

    test('Result forAll true', () => {
        const result = new Result([null, null, null], [true, true, true]);
        expect(result.forAll()).toEqual(true);
    });

    test('Result forAll mixed', () => {
        const result = new Result([null, null, null], [true, false, true]);
        expect(result.forAll()).toEqual(false);
    });

    test('Result forAll bad sub array', () => {
        const result = new Result([null], [[true]]);
        expect(() => result.forAll()).toThrow();
    });

    test('Result forAll good sub array', () => {
        const subResult = new Result([null], [true]);
        const result = new Result([null], [[subResult]]);

        expect(result.forAll()).toEqual(true);
    });

    test('Result forAll mixed sub array', () => {
        const subResult = new Result([null, false], [true, false]);
        const result = new Result([null, null], [true, [subResult]]);

        expect(result.forAll()).toEqual(false);
    });

    test('Result forAny true', () => {
        const result = new Result([null, null, null], [true, true, true]);
        expect(result.forAny()).toEqual(true);
    });

    test('Result forAny mixed', () => {
        const result = new Result([null, null, null], [true, false, true]);
        expect(result.forAny()).toEqual(true);
    });

    test('Result forAny false', () => {
        const result = new Result([null, null, null], [false, false, false]);
        expect(result.forAny()).toEqual(false);
    });

    test('Result forAny bad sub array', () => {
        const result = new Result([null], [[true]]);
        expect(() => result.forAny()).toThrow();
    });

    test('Result forAny good sub array', () => {
        const subResult = new Result([null], [true]);
        const result = new Result([null], [[subResult]]);

        expect(result.forAny()).toEqual(true);
    });

    test('Result forAny mixed sub array', () => {
        const subResult = new Result([null, false], [true, false]);
        const result = new Result([null, null], [true, [subResult]]);

        expect(result.forAny()).toEqual(true);
    });

    test('Result forAny false sub array', () => {
        const subResult = new Result([null, false], [false, false]);
        const result = new Result([null, null], [false, [subResult]]);

        expect(result.forAny()).toEqual(false);
    });

    test('Result forOne bad name', () => {
        const result = new Result([null], [false]);

        expect(() => result.forOne()).toThrow();
        expect(() => result.forOne('')).toThrow();
        expect(() => result.forOne([true])).toThrow();
        expect(() => result.forOne('fn')).toThrow();
    });

    test('Result forOne good name', () => {
        const invokable = new Invokable(() => true, 'fn');
        const result = new Result([invokable], [invokable.invoke()]);

        expect(result.forOne('fn')).toEqual([true]);
    });
});
