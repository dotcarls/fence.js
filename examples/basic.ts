// Register validators, compose a fence, run it, inspect the result.
import { FenceBuilder } from 'fence.js';

import { equals, isString, max, min, required } from './validators.js';

const base = FenceBuilder.create()
    .register('required', required)
    .register('string', isString)
    .register('min', min) //   -> base.min(length: number)
    .register('max', max) //   -> base.max(length: number)
    .register('equals', equals);

// Every call returns a new builder; `base` is never modified.
const username = base.required().string().min(4).max(32).build();

for (const subject of ['tim', 'tim.carlson', 42]) {
    const result = username.run(subject);
    console.log(`${JSON.stringify(subject)} -> ${result.passed ? 'ok' : 'failed'}`);
    for (const failure of result.failures()) {
        console.log(`  ${failure.path.join('.')} failed`);
    }
}

// The full report: every step with its verdict.
console.log(username.run('').explain());
