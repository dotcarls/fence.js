// Fences are data: serialize on one side, restore on another that registered the same names.
import { FenceBuilder, HydrationError } from 'fence.js';

import { isEmail, isString, max, min, policy, required } from './validators.js';

const server = FenceBuilder.create().registerAll({ required, isString, isEmail, min, max, policy });

const text = server.required().isString().max(255);
const userFence = server
    .policy({ username: text.min(4).isEmail().build(), password: text.min(8).build() })
    .build();

// A single JSON document; nested fences are tagged with "$fence".
const wire = JSON.stringify(userFence);
console.log(wire);

// The "client" has functionally equivalent validators registered under the same names.
const client = FenceBuilder.create().registerAll({
    required: (v: unknown) => v != null,
    isString: (v: unknown) => typeof v === 'string',
    isEmail: (v: string) => v.includes('@'),
    min: (v: string, n: number) => v.length >= n,
    max: (v: string, n: number) => v.length <= n,
    policy,
});

const restored = FenceBuilder.fromJSON(wire, client).build();
console.log(restored.run({ username: 'tim@example.com', password: 'long enough' }).passed); // true

// Missing validators are reported all at once.
try {
    FenceBuilder.fromJSON(wire, FenceBuilder.create().register('required', required));
} catch (error) {
    if (error instanceof HydrationError) {
        console.log('missing:', error.missing); // [ 'policy', 'isString', 'max', 'min', 'isEmail' ]
    }
}
