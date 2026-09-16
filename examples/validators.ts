/*
 * The validators used by the examples. fence.js deliberately ships none: register the
 * functions your application already has.
 */
import type { Fence, Result } from 'fence.js';

export const required = (value: unknown): boolean => value !== undefined && value !== null;
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const min = (value: string, length: number): boolean => value.length >= length;
export const max = (value: string, length: number): boolean => value.length <= length;
export const equals = (value: unknown, other: unknown): boolean => value === other;

/** A "policy of fences": one fence per attribute, keyed so failures carry the attribute name. */
export const policy = (
    entity: Record<string, unknown>,
    shape: Record<string, Fence>,
): Record<string, Result> =>
    Object.fromEntries(
        Object.entries(shape).map(([attribute, fence]) => [
            attribute,
            fence.run(entity[attribute]),
        ]),
    );
