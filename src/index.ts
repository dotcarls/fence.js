export { FenceBuilder } from './builder.js';
export { Fence } from './fence.js';
export { Result } from './result.js';
export {
    EmptyFenceError,
    FenceError,
    HydrationError,
    InvalidOutcomeError,
    RegistrationError,
    SerializationError,
} from './errors.js';
export type {
    EmptyRegistry,
    Extend,
    Failure,
    Fluent,
    JsonPrimitive,
    JsonValue,
    MemoizeOptions,
    Merge,
    Outcome,
    Registry,
    ReservedName,
    SerializedFence,
    SerializedStep,
    Simplify,
    Step,
    StepMethods,
    StepOptions,
    StepOutcome,
    Validator,
    ValidatorArgs,
} from './types.js';

/** @deprecated Import the named export: `import { FenceBuilder } from 'fence.js'`. */
export { FenceBuilder as default } from './builder.js';
