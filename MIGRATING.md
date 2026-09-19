# Migrating from fence.js 1.x to 2.0

2.0 keeps the idea of 1.x (named validators, recorded steps, derive-and-extend, serialize and
restore by name) and replaces the implementation. **No 1.x API is carried over**: the names below
are gone, each with a direct replacement, and TypeScript points at every call site. Most 1.x code
needs three kinds of change: drop `fork()`, swap the `register` argument order, and switch to
the new serialization API.

## Requirements

| 1.x                                | 2.0                                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node ≥ 10, ES5 output              | Node ≥ 24, ES2022 output                                                                                                                             |
| CommonJS, ES module and UMD builds | ES modules only. `require()` works on every supported Node; browsers use `<script type="module">` and an ESM CDN. The `window.fence` global is gone. |
| No types                           | Bundled `.d.ts`; the fluent API is typed from your validators                                                                                        |

## API changes

| 1.x                                          | 2.0                                                      | Notes                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `new FenceBuilder()`                         | `FenceBuilder.create()` (the constructor still works)    |                                                                                                                                           |
| `fb.register(fn, 'name', memoize)`           | `fb.register('name', fn, { memoize })`                   | Name first; options object. `registerAll({ name: fn })` registers several. Anonymous functions are fine because the name is always given. |
| `fb.fork()` before deriving                  | Nothing. Every operation returns a new builder.          | Removed.                                                                                                                                  |
| `fb.name(args)` mutates `fb`                 | `fb.name(args)` returns a new builder; `fb` is unchanged | The change most likely to alter behavior: code that relied on in-place mutation (`fb.min(4); fb.build()`) must use the returned value.    |
| `fb.serialize()`                             | `JSON.stringify(fb)` or `fb.toJSON()`                    | One JSON document, format version 2. Removed.                                                                                             |
| `fb.hydrate(str)`                            | `FenceBuilder.fromJSON(json, base)`                      | `base` is a builder or a plain registry. Removed. Stored 1.x strings must be converted first (below).                                     |
| `fence.run(a, b, …)`                         | `fence.run(subject)`                                     | One subject. Pass extra values as recorded step arguments instead.                                                                        |
| `result.forAll()` / `forAny()` / `forOne(n)` | `result.passed` / `result.anyPassed` / `result.for(n)`   | Removed.                                                                                                                                  |
| `result.explain(logger)`                     | `result.explain()` returns a string                      | Log it yourself.                                                                                                                          |
| Errors thrown as strings                     | `FenceError` subclasses                                  | `RegistrationError`, `EmptyFenceError`, `SerializationError`, `HydrationError`, `InvalidOutcomeError`.                                    |
| `new Invokable(...)`                         | Removed                                                  | Steps are plain `{ name, args }` records exposed as `builder.steps` / `fence.steps`.                                                      |
| `import FenceBuilder from 'fence.js'`        | `import { FenceBuilder } from 'fence.js'`                | Named exports only.                                                                                                                       |

## Behavior changes

- **More names are reserved.** Besides builder members, `Object.prototype` member names
  (`toString`, `valueOf`, `hasOwnProperty`, …) and `then` cannot name validators.
- **Registrations no longer leak.** In 1.x, `register()` wrote onto a shared prototype, so a
  validator registered on one builder appeared on unrelated builders. In 2.0 each builder's
  registry is its own; `FenceBuilder.fromJSON` therefore needs a `base` that has the validators.
- **Empty builders fail at `build()`**, not at `run()`, with `EmptyFenceError`.
- **Validators are called with `this === undefined`**, memoized or not.
- **Memoization caches every outcome**, including `false`, keyed by SameValueZero (or identity
  for objects). In 1.x `false` results were recomputed and keys were coerced to strings. The
  cache belongs to each built fence; `dememoize()` is gone (build a new fence instead).
- **Nested results may be records.** A policy validator can return `{ attribute: Result }`
  instead of `Result[]`; `failures()` then reports paths like `['policy', 'password', 'min']`.
  Iterate the policy's shape rather than the entity so a missing attribute fails instead of
  being skipped (the 1.x example iterated the entity, which let `{}` pass).
- **Serializing non-JSON arguments throws** `SerializationError` instead of silently producing
  something that fails on restore. Fences inside arguments are supported and round-trip.
- **`fromJSON` reports all missing names at once** in `HydrationError.missing`.
- **Validators must return an outcome** (`boolean`, `Result[]` or `Record<string, Result>`);
  anything else throws `InvalidOutcomeError`. In 1.x a truthy non-boolean displayed as passing
  in `explain()` but failed `forAll()`.

## Before and after

```js
// 1.x
const FenceBuilder = require('fence.js');
let FB = new FenceBuilder();
FB = FB.register(utils.required, 'required').register(minLength, 'min');

const base = FB.fork().required();
const username = base.fork().min(4).build();
const password = base.fork().min(8).build();

const blob = base.serialize();
const again = FB.fork().hydrate(blob).build();
console.log(again.run('x').forAll());
```

```ts
// 2.0
import { FenceBuilder } from 'fence.js';

const FB = FenceBuilder.create().register('required', utils.required).register('min', minLength);

const base = FB.required();
const username = base.min(4).build();
const password = base.min(8).build();

const json = JSON.stringify(base);
const again = FenceBuilder.fromJSON(json, FB).build();
console.log(again.run('x').passed);
```

## Serialized data written by 1.x

1.x `serialize()` produced a JSON array of JSON strings, each `{"_name": ..., "_args": [...]}`.
2.0 does not read it. Convert stored blobs once, on the way in, with a few lines of your own:

```ts
import { FenceBuilder, type SerializedFence } from 'fence.js';

function fromV1(blob: string): SerializedFence {
  const steps = (JSON.parse(blob) as string[]).map((raw) => {
    const { _name, _args = [] } = JSON.parse(raw) as { _name: string; _args?: unknown[] };
    return { name: _name, args: _args as SerializedFence['steps'][number]['args'] };
  });
  return { fence: 2, steps };
}

const builder = FenceBuilder.fromJSON(fromV1(oldString), base);
store.set('policy', JSON.stringify(builder)); // re-save in the version 2 format
```

`fromJSON` validates the converted document, so a blob that named unregistered validators or
carried non-JSON arguments is reported rather than restored. 1.x could not serialize fences nested
inside arguments (they became plain objects), so legacy blobs never contain working nested fences;
rebuild those in code.
