# Migrating from fence.js 1.x to 2.0

2.0 keeps the idea of 1.x (named validators, recorded steps, fork-and-extend, serialize and
rehydrate by name) and replaces the implementation. Most 1.x code needs three kinds of change:
stop calling `fork()`, swap the `register` argument order, and switch to the new
serialization API. Deprecated aliases keep the old names working during the transition.

## Requirements

| 1.x                                | 2.0                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node ≥ 10, ES5 output              | Node ≥ 20.19, ES2022 output                                                                                                                        |
| CommonJS, ES module and UMD builds | ES modules only. `require()` works on Node 20.19+/22.12+; browsers use `<script type="module">` and an ESM CDN. The `window.fence` global is gone. |
| No types                           | Bundled `.d.ts`; the fluent API is typed from your validators                                                                                      |

## API changes

| 1.x                                          | 2.0                                                      | Notes                                                                                                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new FenceBuilder()`                         | `FenceBuilder.create()` (the constructor still works)    |                                                                                                                                                                                       |
| `fb.register(fn, 'name', memoize)`           | `fb.register('name', fn, { memoize })`                   | Name first; options object. `registerAll({ name: fn })` registers several. Anonymous functions are fine because the name is always given.                                             |
| `fb.fork()` before deriving                  | Nothing. Every operation returns a new builder.          | `fork()` remains and returns the builder itself.                                                                                                                                      |
| `fb.name(args)` mutates `fb`                 | `fb.name(args)` returns a new builder; `fb` is unchanged | This is the change most likely to alter behaviour: code that relied on in-place mutation (`fb.min(4); fb.build()`) must use the returned value.                                       |
| `fb.serialize()`                             | `JSON.stringify(fb)` or `fb.toJSON()`                    | Single JSON document, format version 2. `serialize()` remains as an alias.                                                                                                            |
| `fb.hydrate(str)`                            | `FenceBuilder.fromJSON(json, base)`                      | `base` is a builder or a plain registry. `hydrate()` remains as an alias but no longer accepts v1 output; old serialized strings go through `FenceBuilder.fromLegacyJSON(str, base)`. |
| `fence.run(a, b, …)`                         | `fence.run(subject)`                                     | One subject. Pass extra values as recorded step arguments instead.                                                                                                                    |
| `result.forAll()` / `forAny()` / `forOne(n)` | `result.passed` / `result.anyPassed` / `result.for(n)`   | Old names remain as aliases.                                                                                                                                                          |
| `result.explain(logger)`                     | `result.explain()` returns a string                      | Log it yourself.                                                                                                                                                                      |
| Errors thrown as strings                     | `FenceError` subclasses                                  | `RegistrationError`, `EmptyFenceError`, `SerializationError`, `HydrationError`, `InvalidOutcomeError`.                                                                                |
| `new Invokable(...)`                         | Removed                                                  | Steps are plain `{ name, args }` records exposed as `builder.steps` / `fence.steps`.                                                                                                  |
| `import FenceBuilder from 'fence.js'`        | `import { FenceBuilder } from 'fence.js'`                | The default export remains, deprecated.                                                                                                                                               |

## Behaviour changes

- **More names are reserved.** Besides builder members, `Object.prototype` member names
  (`toString`, `valueOf`, `hasOwnProperty`, …) and `then` cannot name validators.
- **Registrations no longer leak.** In 1.x, `register()` wrote onto a shared prototype, so a
  validator registered on one builder appeared on unrelated builders. In 2.0 each builder's
  registry is its own; `FenceBuilder.fromJSON` therefore needs a `base` builder that has the
  validators.
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
  something that fails on rehydration. Fences inside arguments are supported and round-trip.
- **`hydrate`/`fromJSON` report all missing names at once** in `HydrationError.missing`.
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

```ts
const builder = FenceBuilder.fromLegacyJSON(oldString, base);
localStorage.setItem('policy', JSON.stringify(builder)); // re-save in the v2 format
```

1.x could not serialize fences nested inside arguments (they became plain objects), so legacy
blobs never contain working nested fences; rebuild those in code.
