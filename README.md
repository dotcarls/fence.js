# fence.js

[![npm](https://img.shields.io/npm/v/fence.js.svg?style=flat-square)](https://www.npmjs.com/package/fence.js)
[![CI](https://github.com/dotcarls/fence.js/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/dotcarls/fence.js/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/fence.js.svg?style=flat-square)](LICENSE)

> Composable, portable validations. Register the validator functions you already have, compose
> them into fences with a fluent, fully typed API, run them anywhere, and serialize them to JSON
> so the same validation can run on another runtime that registered the same names.

fence.js is not a schema library and ships no validators. It is the composition layer: a fence
is _data_ (a list of named steps and their arguments), which is what makes it derivable,
serializable and deterministic across environments.

- **Immutable builder.** Every operation returns a new builder; derive as many fences from a
  base as you like without copying.
- **Typed from your validators.** `register('min', (v: string, n: number) => …)` gives you
  `.min(n: number)` with autocompletion; unknown or misspelled steps are compile errors.
- **Nested results.** A validator may run other fences, so a "policy of fences" (one per
  attribute) produces one result tree with precise failure paths.
- **Portable.** `JSON.stringify(fence)` is the wire format; `FenceBuilder.fromJSON(json, base)`
  restores it wherever the same validator names are registered (pass a builder or a plain
  registry as `base`). Nested fences round-trip.
- **Zero dependencies, ESM only,** about 9 KB gzipped unminified, runs on Node 20.19+ and in
  evergreen browsers.

## Install

```sh
npm install fence.js
```

fence.js is published as ES modules. Node consumers can `import` it, or `require()` it on Node
20.19+ / 22.12+ (which support `require(esm)`). Browsers load it natively from any ESM CDN:

```html
<script type="module">
  import { FenceBuilder } from 'https://esm.sh/fence.js@2';
</script>
```

While 2.0 is in prerelease, pin the exact version in the URL (`fence.js@2.0.0-beta.1`). The
declarations need TypeScript 5.0+ with `lib` ES2020 or later.

## Quick start

```ts
import { FenceBuilder } from 'fence.js';

const base = FenceBuilder.create()
  .register('required', (v: unknown) => v != null)
  .register('string', (v: unknown): v is string => typeof v === 'string')
  .register('min', (v: string, n: number) => v.length >= n)
  .register('max', (v: string, n: number) => v.length <= n)
  .register('email', (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

// Builders are values: `text` is shared, `username` and `password` are independent.
const text = base.required().string().max(255);
const username = text.min(4).email().build();
const password = text.min(8).build();

const result = username.run('tim');
result.passed; //   false
result.failures(); // [{ path: ['min'], step: { name: 'min', args: [4] }, subject: 'tim' },
//                     { path: ['email'], step: { name: 'email', args: [] }, subject: 'tim' }]
console.log(result.explain());
// subject: "tim"
// FAILED (3/5 steps)
//   [✓] required
//   [✓] string
//   [✓] max(255)
//   [x] min(4)
//   [x] email
```

## Concepts

| Term          | What it is                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| **Validator** | Any function `(subject, ...args) => boolean \| Result[] \| Record<string, Result>`. Yours, not ours.       |
| **Registry**  | The validators a builder knows, by name. Names are what serialized fences refer to.                        |
| **Builder**   | `FenceBuilder`: an immutable registry plus a list of recorded steps, with one fluent method per validator. |
| **Step**      | `{ name, args }`: a validator name and the arguments to pass after the subject.                            |
| **Fence**     | `builder.build()`: the runnable, immutable validation.                                                     |
| **Result**    | What `fence.run(subject)` returns: every step paired with its outcome, plus verdicts and failure paths.    |

### Registering validators

```ts
const base = FenceBuilder.create()
  .register('min', (v: string, n: number) => v.length >= n)
  .registerAll({ required, isString, isEmail }); // a record works too
```

The first parameter of a validator is the subject; the rest become the fluent method's
parameters. Names must be unique within a registry and may not shadow builder or `Object.prototype`
members (`build`, `step`, `then`, `toString`, …); both rules are enforced at compile time,
with the reason spelled out in the error, and at run time (`RegistrationError`).
`registerAll(otherBuilder)` copies a registry including its options and rejects overlapping
names the same way.

Validators are called as plain functions (`this` is `undefined`) with the subject first, then
the recorded arguments. Return `true`/`false`, or nested results (below). Anything else throws
`InvalidOutcomeError` when the fence runs.

### Composing and running

```ts
const fence = base.required().min(4).build(); // fluent
const same = base.step('required').step('min', 4).build(); // the typed primitive under the sugar

fence.steps; //  [{ name: 'required', args: [] }, { name: 'min', args: [4] }]
fence.run('tim').passed; // false
fence.run('tim').anyPassed; // true
fence.run('tim').for('min'); // [false]
```

`build()` on a builder with no steps throws `EmptyFenceError`.

### Nested results: a policy of fences

A validator may return an array or a record of `Result`s. Record keys and array indices become
path segments in `failures()`, so a whole entity can be validated by one fence:

```ts
import type { Fence, Result } from 'fence.js';

const policy = (entity: Record<string, unknown>, shape: Record<string, Fence>) =>
  Object.fromEntries(
    Object.entries(shape).map(([key, fence]) => [key, fence.run(entity[key])]),
  ) as Record<string, Result>;

const user = base.register('policy', policy).policy({ username, password }).build();

user
  .run({ username: 'tim', password: 'short' })
  .failures()
  .map((f) => f.path.join('.'));
// ['policy.username.min', 'policy.username.email', 'policy.password.min']
```

An empty nested collection counts as passed for `passed` and as not passed for `anyPassed`;
`explain()` prints `(no nested results)` so a policy that matched nothing is visible.

### Memoization

Pure validators can cache outcomes per subject. The cache belongs to the built fence, so two
fences built from the same builder never share results, and `false` outcomes are cached too.

```ts
base.register('knownDomain', lookup, { memoize: true });
base.register('knownDomain', lookup, { memoize: { key: (s) => String(s).toLowerCase() } });
```

Primitive keys are compared with SameValueZero (`1` and `'1'` are different keys); object keys
are held weakly by identity.

### Serialization

A builder or fence serializes to a single JSON document; nested fences are tagged:

```ts
JSON.stringify(user);
// {"fence":2,"steps":[{"name":"policy","args":[{"username":{"$fence":{"fence":2,"steps":[…]}},…}]}]}

const restored = FenceBuilder.fromJSON(json, clientBase).build();
```

`fromJSON` accepts a string or a parsed object and, as `base`, a builder (its options such
as `memoize` apply) or a plain registry. It validates the whole document, including that
every argument is a JSON value, and throws
`HydrationError` whose `missing` property lists **every** validator name (nested included) the
base registry lacks. Only JSON values and fences may appear in step arguments; anything else
throws `SerializationError` when serializing (trailing `undefined` arguments are dropped when a
step is recorded, so optional parameters left out stay serializable).

Because fences refer to validators by name, the two sides only need validators that are
_functionally equivalent_ under the same names; they can be different implementations.

### Errors

Every error fence.js raises about validation input or state extends `FenceError`:
`RegistrationError`, `EmptyFenceError`, `SerializationError`, `HydrationError` (`.missing`),
`InvalidOutcomeError` (`.step`, `.value`). Arguments of the wrong JavaScript type (a non-object
`base` for `fromJSON`, a malformed step for the `Fence` or `Result` constructor) raise a plain
`TypeError`. Exceptions thrown by your validators propagate unchanged.

## TypeScript

The registry is a type parameter, so a builder's type tells you exactly which steps exist:

```ts
const base = FenceBuilder.create().register('min', (v: string, n: number) => v.length >= n);

base.min(4); //        ok
base.min('4'); //      error: Argument of type 'string' is not assignable to parameter of type 'number'
base.step('max', 1); //  error: '"max"' is not assignable to '"min"'
base.register('build', fn); // error: reserved name

type UserBuilder = Fluent<typeof base.registry>; // name the type when you need to pass it around

// Generic code accepts any builder:
const names = <R extends Registry>(b: FenceBuilder<R>) => b.steps.map((s) => s.name);
```

Annotate validator parameters: unannotated ones are `any`. Registering under a name that is
not a string literal (or a `Record<string, Validator>`) is allowed but widens the builder's
type so every fluent method accepts any arguments; a wide builder stays wide.

Types you may want: `Validator`, `Registry`, `Fluent<R>`, `Step`, `Outcome`, `Failure`,
`SerializedFence`, `StepOptions`.

## Performance

Fences do very little at run time: each step is one bound function call and one result record.
`npm run bench` compares against validate.js and Joi on the same policies (tinybench, Node 22,
Apple silicon; higher is better, numbers are indicative only):

| Case                          | fence.js | validate.js | Joi    |
| ----------------------------- | -------- | ----------- | ------ |
| user policy, 20 users (ops/s) | 67,900   | 24,600      | 41,700 |
| strict equality, 20 values    | 586,600  | 33,800      | 59,400 |

## Examples and API reference

Runnable, type-checked examples live in
[`examples/`](https://github.com/dotcarls/fence.js/tree/master/examples) (`npm run examples`). The
generated API reference is at <https://dotcarls.github.io/fence.js>.

## Migrating from 1.x

2.0 is a rewrite with an immutable builder, real error classes, a new serialization format and
TypeScript types. See [MIGRATING.md](MIGRATING.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Design decisions, the architecture and the way work is
tracked live in the [documentation index](docs/INDEX.md).

## License

[MIT](LICENSE)
