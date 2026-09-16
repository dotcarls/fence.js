# fence.js v2 — Assessment and Modernization Proposal

_Prepared 2026-09-16 against `master` @ `3f580f1` (v1.0.1). All findings below were reproduced locally on Node 22.15 / npm 10.9._

---

## 1. Summary

fence.js is a ~400-line library with a genuinely good core idea: **validations as data**. A `FenceBuilder` holds a registry of named validator functions; composing a fence records a list of `(name, args)` steps rather than closures, so the same fence can be forked, extended, serialized to JSON, and rehydrated on another runtime that has functionally equivalent validators under the same names. That idea is still worth having and has few direct competitors (Zod, Valibot, Joi etc. are schema libraries, not portable step recorders).

The implementation, however, is 2017-era Babel/ES2015 code and carries several real defects:

- `register()` mutates a **shared prototype** (on a fresh builder, `FenceBuilder.prototype` itself), so registrations leak between unrelated builders.
- The prototype chain **grows one level per `register()`/`fork()`** (depth 11 after a realistic setup).
- Step methods mutate the builder in place while `register()`/`fork()` return copies, so `base.min(4)` and `base.min(8)` **produce the same object with both steps**.
- Memoization **never caches a `false` result**, coerces keys to strings, and returns `Object` when the subject is the string `"constructor"`.
- Errors are thrown as **plain strings** (no stack, `instanceof Error` is false).
- Serialize/hydrate **silently breaks higher-order fences** (a policy of fences).
- The integration test suite **cannot run** (depends on the sabotaged `faker@6.6.6`), the lint script never lints `src/lib`, the pre-commit hooks are wired for husky 0.x and do not fire, the benchmark requires a path that does not exist, and `npm audit` reports 111 vulnerabilities across 1,619 dev dependencies.
- There are **no type declarations**; TypeScript consumers get `any` for the whole API.

The proposal is a **v2.0 rewrite in TypeScript** that keeps the concept and the fluent API shape, replaces the prototype-mutation architecture with an immutable, registry-based builder whose chainable methods are **typed by inference from the registered validators**, defines a versioned serialization format that round-trips nested fences, and replaces the toolchain with the current canonical stack (TypeScript + tsc/tsdown, Vitest, ESLint flat config, GitHub Actions, npm provenance). Estimated effort: 4–6 focused days for a single maintainer, spread over five phases that each leave `master` releasable.

---

## 2. Current state

### 2.1 Concept model (worth keeping)

```
FenceBuilder ──register(fn, name)──▶ FenceBuilder (with .name() method)
     │
     ├─ .name(...args)   records Invokable{fn, name, args}
     ├─ .fork()          copy that can be extended independently
     ├─ .serialize()     JSON of [{name,args}]      ─┐
     └─ .build() ──▶ Fence                            │  .hydrate(json) rebuilds steps
                       └─ .run(...subjects) ──▶ Result  from names in the registry
                                                  ├─ forAll() / forAny() / forOne(name)
                                                  └─ explain()
```

Four source files, `src/lib/{FenceBuilder,Fence,Invokable,Result}.js`, plus a re-export in `src/index.js`.

### 2.2 Verified correctness defects

| #   | Defect                                                                                                                                                                                                                                                            | Where                                             | Evidence (reproduced)                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| C1  | `register()` writes the new method onto `Object.getPrototypeOf(this)`. On a fresh builder that is `FenceBuilder.prototype`, so every builder in the process gains the method. Contradicts the README claim that forks do not mutate the parent.                   | `FenceBuilder.js:66-75`                           | `new FenceBuilder().register(fn,'leaked'); typeof new FenceBuilder().leaked === 'function'` |
| C2  | Every `register()` and `fork()` adds a prototype level (`Object.create(proto)`). Lookups walk a chain whose depth is proportional to setup steps.                                                                                                                 | `FenceBuilder.js:35-55`                           | 7 registers + 3 forks → chain depth **11**                                                  |
| C3  | Generated step methods `push` into `this._invokables` and return `this`, while `register`/`fork` return new objects. Sibling derivations without an explicit `.fork()` share state.                                                                               | `FenceBuilder.js:68-72`                           | `a = base.min(4); b = base.min(8); a === b`, base has 2 steps, `'abcdef'` fails             |
| C4  | Memo cache is a plain object keyed by `String(args[0])` and checked with `if (cache[key])`. `false` results are never cached (the common case for a validator); `1` and `'1'` and all objects collide; inherited keys like `constructor` are returned as results. | `Invokable.js:75-90`                              | `invoke('b')` ×2 → 2 calls; `invoke('constructor')` returns a **function**                  |
| C5  | Memoized invocation calls the validator with `this === fn`; plain invocation uses `this === Invokable`.                                                                                                                                                           | `Invokable.js:47-57, 83`                          | `this.constructor.name` → `Invokable` vs `Function`                                         |
| C6  | All validation errors are `throw 'string'`. No stack trace, not `instanceof Error`, cannot be discriminated by callers.                                                                                                                                           | all four files                                    | `typeof e === 'string'`                                                                     |
| C7  | `Fence.run()` on a builder with zero steps throws (via `Result` constructor) instead of failing at `build()` or returning a vacuous result.                                                                                                                       | `Result.js:13-19`                                 | `new FenceBuilder().build().run('x')` throws a string                                       |
| C8  | Nested results: an empty array is vacuously `true` for `forAll` and `false` for `forAny`; `explain()` prints `[✓]` for any truthy value including arrays and non-booleans that `forAll` would reject.                                                             | `Result.js:35-52, 119`                            | `policy → []` on `{}` gives `forAll() === true`                                             |
| C9  | `serialize()` is `JSON.stringify(this)`; step arguments that are `Fence` instances become plain objects, and `hydrate()` restores them as plain objects. Higher-order policies (the headline example in `example/policy.js`) do not survive a round trip.         | `Invokable.js:110-112`, `FenceBuilder.js:113-132` | hydrate then run → `TypeError: f.run is not a function`                                     |
| C10 | `FenceBuilder.serialize()` double-encodes: an array of JSON _strings_ is itself stringified. `hydrate()` must `JSON.parse(x).map(JSON.parse)`. Output is not a normal JSON document of the fence.                                                                 | `FenceBuilder.js:95-101`                          | see `example/serialize.js` output                                                           |
| C11 | Dead parameters: `register(fn, name, memoize, debug, loggers)` passes 5 args to a 4-arg `Invokable`; `serialize(returnFull)` is ignored; `fork(proto)` exposes an implementation detail.                                                                          | `FenceBuilder.js:66, 95, 35`                      | arity check                                                                                 |
| C12 | `Result` stores the `subjects` rest array under `_subject` and `explain()` prints it as an array even for a single subject.                                                                                                                                       | `Fence.js:28`, `Result.js:103`                    | `subject: ["a"]` in example output                                                          |

### 2.3 Tooling and project-health findings

| #   | Finding                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | `__tests__/sanity.test.js` fails to load: `faker@^6.6.6` resolves to the sabotaged January-2022 release with no `main`. **42 unit tests pass; the only end-to-end suite never runs.** Coverage is 73% overall and **0% for `Fence.js`**, despite CONTRIBUTING.md asking for 100%.                                                                              |
| T2  | `lint:eslint` runs `eslint src/*.js`, which matches only `src/index.js`. `src/lib/**` has never been linted by the script. `.eslintrc` is the legacy format with `ecmaVersion: 2017`.                                                                                                                                                                          |
| T3  | `precommit`/`prepush` npm scripts are the husky 0.x convention; husky 8 is installed but no `.husky/` directory or `core.hooksPath` exists. Hooks do not run.                                                                                                                                                                                                  |
| T4  | `__tests__/benchmark.test.js` requires `../cjs` (does not exist; build emits `dist/cjs`) and calls `Joi.validate`, removed in Joi 16.                                                                                                                                                                                                                          |
| T5  | Build: Rollup 2 with both `rollup-plugin-babel` (deprecated) and `@rollup/plugin-babel`; `rollup-plugin-node-builtins`/`-globals` for a library with zero runtime deps; Terser runs before the CommonJS plugin. Output is transpiled to ES5 (class helpers, `_classCallCheck`) for a package declaring `node >= 10`.                                           |
| T6  | `package.json`: `main`/`module`/`browser` but no `exports`, `types`, or `sideEffects`; `jsxnext:main` is a typo of the long-dead `jsnext:main`; `prepublish` (deprecated hook); `BABEL_ENV=production` inline (not portable, `cross-env` is installed but unused); `engines: node >= 10` (EOL April 2021).                                                     |
| T7  | Dev dependencies: 1,619 packages, `npm audit` → 13 critical / 56 high / 33 moderate / 9 low. Unused: `eslint-config-airbnb`, `eslint-config-devine`, `eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `babel-plugin-add-module-exports`, `babel-core` bridge, `cross-env`. Unmaintained: `esdoc` and its forks, `rollup-plugin-*` legacy plugins, `coveralls`. |
| T8  | CI: `.travis.yml` targets Node 10/12/14 on travis-ci.org (shut down 2021). Only the CodeQL workflow runs on GitHub Actions. README badges for Travis and David-DM are dead.                                                                                                                                                                                    |
| T9  | Docs: README example has invalid syntax (`function (val1, val2, 'strictEqual')`), links to `example/script.js` (missing) and `require('./lib')`. CONTRIBUTING.md and `.esdoc.json` still say "Chain" (the pre-rename name) and reference `build:watch`, which does not exist. No CHANGELOG.                                                                    |
| T10 | No `.d.ts`. ESDoc comments are the only API documentation and are partially wrong (e.g. `register(name, fn)` order in the JSDoc vs `register(fn, name)` in code).                                                                                                                                                                                              |

### 2.4 What is good and should be preserved

- The core abstraction (registry + recorded steps + late binding by name) and the four nouns: builder, fence, step/invokable, result.
- The fluent style: `base.fork().required().min(4).email().build()`.
- Zero runtime dependencies and a small footprint (1.8 KB gzip today).
- Nested results (a validator may return `Result[]`), which is what makes "policy of policies" work.
- The examples in `example/` and the comparison tests against validate.js/Joi, once repaired.

---

## 3. Goals and non-goals

**Goals**

1. Ship as `fence.js@2.0.0`, TypeScript-first, with full inferred types for the fluent API.
2. Fix every defect in §2.2 by construction, not by patching.
3. Immutable, value-semantics builder: every operation returns a new builder; no prototype mutation; no `fork()` discipline required for correctness.
4. Versioned, single-encoded, JSON-document serialization that round-trips nested fences.
5. Modern distribution: ESM-first with a CJS build, `exports` map, bundled `.d.ts`, `sideEffects: false`, Node ≥ 20.
6. A toolchain that a contributor in 2026 recognizes: `tsc`, Vitest, ESLint 9 flat config + typescript-eslint, Prettier, GitHub Actions, provenance-attested npm publish.
7. Working CI, working hooks, ≥ 95% coverage enforced.

**Non-goals (for 2.0)**

- Async validators. Designed for (see §4.8) but shipped in 2.1 to keep 2.0 scoped.
- Built-in validator library. fence.js is a composition framework; keep validators user-supplied (examples move to `examples/` and tests).
- A UMD/global-script build. CDNs (esm.sh, jsDelivr `+esm`) serve ESM directly.
- Byte-compatible v1 serialization. Provide a one-way importer instead (§5).

---

## 4. Proposed architecture

### 4.1 Module layout

```
src/
  index.ts          public surface: FenceBuilder, Fence, Result, errors, types
  builder.ts        FenceBuilder<R>  (immutable; registry + steps)
  fence.ts          Fence<R>         (frozen steps; run())
  step.ts           Step, invoke(), memoization
  result.ts         Result, Outcome, explain()
  serialize.ts      SerializedFence v2 schema, toJSON/fromJSON, v1 importer
  errors.ts         FenceError hierarchy
  types.ts          Validator, Registry, ValidatorArgs, JsonValue
```

Total is expected to stay under ~500 lines including doc comments.

### 4.2 Core types

```ts
// types.ts
export type Outcome = boolean | readonly Result[];
export type Validator = (subject: any, ...args: any[]) => Outcome;
export type Registry = Readonly<Record<string, Validator>>;

/** Trailing parameters of a validator: what the fluent method accepts. */
export type ValidatorArgs<F> = F extends (subject: any, ...args: infer A) => Outcome ? A : never;

/** Fluent methods derived from the registry at the type level. */
export type StepMethods<R extends Registry> = {
  readonly [K in keyof R & string]: (...args: ValidatorArgs<R[K]>) => FenceBuilder<R>;
};
```

The registry is carried as a generic parameter `R`, so `register('min', (v: string, n: number) => …)` yields a builder whose type includes `min(n: number): FenceBuilder<R>`. This is the canonical TypeScript pattern for fluent builders whose vocabulary grows (compare Kysely, Drizzle, tRPC routers). Consumers get autocompletion and argument checking for free; misspelled step names are compile errors, not runtime `hydrate` failures.

### 4.3 `FenceBuilder<R>` — immutable, registry-based

```ts
// builder.ts
export class FenceBuilder<R extends Registry = {}> {
  readonly #registry: R;
  readonly #steps: readonly Step[];

  private constructor(registry: R, steps: readonly Step[]) { … }

  static create(): FenceBuilder<{}> { return new FenceBuilder({}, []); }

  register<N extends string, F extends Validator>(
    name: N,
    fn: F,
    options?: StepOptions,
  ): FenceBuilder<R & Record<N, F>> & StepMethods<R & Record<N, F>> {
    if (name in this.#registry) throw new RegistrationError(`'${name}' is already registered`);
    return FenceBuilder.#fluent(new FenceBuilder({ ...this.#registry, [name]: fn }, this.#steps));
  }

  /** Explicit, fully typed alternative to the fluent methods. */
  step<K extends keyof R & string>(name: K, ...args: ValidatorArgs<R[K]>): FenceBuilder<R> & StepMethods<R> {
    return FenceBuilder.#fluent(new FenceBuilder(this.#registry, [...this.#steps, Step.of(name, args)]));
  }

  build(): Fence<R> { return new Fence(this.#registry, this.#steps); }
  toJSON(): SerializedFence { … }                       // §4.6
  static fromJSON<R extends Registry>(json: unknown, registry: R): FenceBuilder<R> { … }

  /** Attach fluent methods as own, non-enumerable properties of the new instance. */
  static #fluent<R extends Registry>(b: FenceBuilder<R>): FenceBuilder<R> & StepMethods<R> { … }
}
```

Design decisions and what they fix:

- **Every method returns a new instance; the class has no mutating method.** Fixes C1, C3. `fork()` becomes a no-op alias retained for readability (returns `this`) and can be dropped in 3.0.
- **No prototype manipulation.** Fluent methods are attached to each new instance (Proxy or `Object.defineProperty` over `Object.keys(registry)`). Builder construction is not the hot path, `run()` is, so the per-fork cost is acceptable; a Proxy trap is the cheaper variant if registries get large. Fixes C2.
- **`step(name, ...args)`** is the primitive; fluent methods are sugar over it. It is also what `fromJSON` uses, so hydration and hand-composition go through one code path.
- **Registration order**: `register(name, fn)` (name first) matches the JSDoc that has always described it that way and reads naturally. Anonymous functions are fine because the name is now mandatory (C11's name-inference edge cases disappear).
- **Duplicate registration is an error** rather than a silent overwrite.
- **Private fields (`#`)** replace `_underscore` conventions. Tests that poked `_invokables`/`_name` will be rewritten against public behaviour.

### 4.4 `Fence<R>` and `Step`

```ts
// fence.ts
export class Fence<R extends Registry = Registry> {
  constructor(registry: R, steps: readonly Step[]) {
    if (steps.length === 0) throw new EmptyFenceError();       // fixes C7 at build time
    …
  }
  run(subject: unknown, ...extra: unknown[]): Result { … }     // subject is singular (fixes C12)
  toJSON(): SerializedFence { … }
}

// step.ts
export interface Step { readonly name: string; readonly args: readonly unknown[]; }
export interface StepOptions { memoize?: boolean | { key?: (subject: unknown) => unknown } }
```

`invoke(step, registry, subject, extra)` looks the validator up **by name at run time** in the fence's frozen registry. This preserves the late-binding property that motivates the library (server and client can register different implementations under one name) while keeping `Step` a pure data record, which is what makes serialization trivial and correct.

`Fence.run` calls the validator with `this` undefined, always (fixes C5). Validators are plain functions.

### 4.5 Memoization

Replace the hand-rolled cache with a per-`Fence`, per-step `Map` (or `WeakMap` when the key is an object):

```ts
function memoize(fn: Validator, keyOf = (s: unknown) => s): Validator {
  const prim = new Map<unknown, Outcome>();
  const objs = new WeakMap<object, Outcome>();
  return (subject, ...args) => {
    const k = keyOf(subject);
    const cache = typeof k === 'object' && k !== null ? objs : prim;
    if (cache.has(k as never)) return cache.get(k as never)!;
    const out = fn(subject, ...args);
    cache.set(k as never, out);
    return out;
  };
}
```

- `Map.has` caches `false` and any other result (fixes C4's falsy bug).
- SameValueZero keys: `1` and `'1'` are distinct; objects are keyed by identity via `WeakMap`, so there is no string coercion and no `Object.prototype` leakage (fixes the `constructor` bug).
- Cache lives on the **built `Fence`**, not on the shared step, so two fences built from the same builder do not share state. `dememoize()` is dropped; build a new fence.
- Memoization is only valid for pure validators; the option docs say so and the default remains off.

### 4.6 Serialization v2

A single JSON document, one encode, versioned, self-describing:

```json
{
  "fence": 2,
  "steps": [
    { "name": "required", "args": [] },
    { "name": "max", "args": [255] },
    { "name": "policy", "args": [{ "username": { "$fence": { "fence": 2, "steps": [ … ] } } }] }
  ]
}
```

- `FenceBuilder`, `Fence`, and `Step` implement `toJSON()`, so `JSON.stringify(fence)` is the serializer (fixes C10).
- Nested fences serialize as tagged objects (`{"$fence": …}`) and `fromJSON` revives them recursively with the same registry (fixes C9). Any other non-JSON argument (function, `Date`, `Map`, class instance) throws `SerializationError` at serialize time instead of degrading silently.
- `fromJSON` validates shape (version, array of `{name: string, args: unknown[]}`) and throws `HydrationError` listing **all** unknown names at once, not just the first.
- A `fromLegacyJSON(v1String, registry)` importer handles the current double-encoded format for one major version.

### 4.7 `Result`

```ts
export class Result {
  readonly subject: unknown;
  readonly outcomes: ReadonlyArray<{ readonly step: Step; readonly value: Outcome }>;

  get passed(): boolean; // every outcome true / every nested result passed
  get anyPassed(): boolean;
  for(name: string): Outcome[]; // was forOne
  failures(): Array<{ path: string[]; step: Step }>; // new: flattened list for UI/error mapping
  explain(): string; // returns text; caller decides where it goes (no console)
  toJSON(): SerializedResult;
}
```

- Boolean queries become getters; `forAll`/`forAny`/`forOne` remain as deprecated aliases in 2.x.
- **Empty nested arrays** are treated as _passed_ for `passed` and _failed_ for `anyPassed` (unchanged semantics), but this is now documented, and `explain()` reports the count so a policy that matched nothing is visible (addresses C8). Validators that return something other than `boolean | Result[]` cause an `InvalidOutcomeError` at run time, with the step name in the message.
- `failures()` is the one genuinely new capability: it flattens nested results into `[path, step]` pairs, which is what every form/API consumer ends up writing by hand today.

### 4.8 Errors

```ts
export class FenceError extends Error { override readonly name = 'FenceError'; }
export class RegistrationError extends FenceError {}
export class EmptyFenceError extends FenceError {}
export class SerializationError extends FenceError {}
export class HydrationError extends FenceError { constructor(readonly missing: readonly string[]) {…} }
export class InvalidOutcomeError extends FenceError {}
```

Fixes C6. Uses `cause` where an inner error exists.

### 4.9 Async (2.1, designed now)

`Validator` gains a sibling `AsyncValidator = (…) => Promise<Outcome>`; `Fence.run` stays synchronous and throws if any registered validator is async, while `Fence.runAsync` awaits all outcomes with `Promise.all`. Keeping `run` synchronous preserves the benchmark story and avoids forcing `await` on every existing caller.

### 4.10 Public API at a glance (v2)

```ts
import { FenceBuilder } from 'fence.js';

const base = FenceBuilder.create()
  .register('required', (v: unknown) => v != null)
  .register('string', (v: unknown): v is string => typeof v === 'string')
  .register('min', (v: string, n: number) => v.length >= n)
  .register('max', (v: string, n: number) => v.length <= n)
  .register('email', (v: string) => EMAIL.test(v), { memoize: true });

const user = base.required().string().max(255); // FenceBuilder<…> — typed
const username = user.min(4).email().build(); // user is unchanged
const password = user.min(8).build(); // no fork() needed

const policy = base
  .register('policy', (entity: Record<string, unknown>, shape: Record<string, Fence>) =>
    Object.entries(shape).map(([k, f]) => f.run(entity[k])),
  )
  .policy({ username, password })
  .build();

const r = policy.run({ username: 'tim@example.com', password: 'hunter22' });
r.passed; // false
r.failures(); // [{ path: ['policy', 'password', 'min'], step: {name:'min', args:[8]} }]
JSON.stringify(policy); // portable; FenceBuilder.fromJSON(json, base.registry).build() restores it
```

---

## 5. Compatibility and migration

This is a **semver-major** release. Breaking changes and their rationale:

| v1                                    | v2                                                                            | Why                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `new FenceBuilder()`                  | `FenceBuilder.create()` (constructor kept, no args)                           | Private constructor carries registry; `create()` is the typed entry point             |
| `register(fn, name, memoize)`         | `register(name, fn, { memoize })`                                             | Name first; options bag instead of positional booleans                                |
| step methods mutate `this`            | return a new builder                                                          | C3                                                                                    |
| `fork()` required                     | `fork()` is an identity alias, deprecated                                     | C1–C3                                                                                 |
| `serialize()` → double-encoded string | `toJSON()` / `JSON.stringify(builder)`                                        | C9, C10                                                                               |
| `hydrate(str)` instance method        | `FenceBuilder.fromJSON(json, registry)` static; `fromLegacyJSON` for v1 blobs | Hydration needs a registry, not a builder with steps                                  |
| `run(...subjects)`                    | `run(subject, ...extra)`                                                      | C12                                                                                   |
| `forAll()`/`forAny()`/`forOne()`      | `passed`/`anyPassed`/`for()` (old names kept as deprecated aliases)           | Idiomatic getters                                                                     |
| `explain(logger)`                     | `explain(): string`                                                           | Library must not own console                                                          |
| `throw 'string'`                      | `FenceError` subclasses                                                       | C6                                                                                    |
| `main`/`module`/`browser`, UMD        | `exports` with `import`/`require`/`types`, no UMD                             | §3                                                                                    |
| Node ≥ 10, ES5 output                 | Node ≥ 20, ES2022 output                                                      | 10 years of runtime progress; native `#private`, `??`, `Object.hasOwn`, `Error.cause` |

Publish `2.0.0-beta.x` with a `MIGRATING.md`; keep `1.x` on a `v1` branch for security fixes only.

---

## 6. Toolchain

| Concern   | Today                                  | Proposed                                                                                                                                             | Notes                                                                        |
| --------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Language  | ES2015 via Babel 7                     | **TypeScript 5.x**, `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `module: NodeNext`, `target: ES2022` | Zero Babel                                                                   |
| Build     | Rollup 2 + 8 plugins                   | **`tsc` for `.d.ts`** + **tsdown** (or tsup) for `dist/index.js` (ESM) and `dist/index.cjs`                                                          | One config file; tree-shakeable; source maps                                 |
| Package   | `main`/`module`/`browser`              | `"type": "module"`, `exports: { ".": { types, import, require } }`, `sideEffects: false`, `files: ["dist"]`, `engines: node >= 20`                   | Run `publint` and `@arethetypeswrong/cli` in CI                              |
| Tests     | Jest 29 + babel-jest                   | **Vitest** (`vitest run --coverage` via v8), thresholds 95/95/95/95                                                                                  | Native TS + ESM; `bench` mode replaces the `benchmark` package               |
| Test data | `faker@6.6.6` (broken)                 | `@faker-js/faker` or hand-written fixtures + `fast-check` property tests for serialize/hydrate round-trip                                            | Property tests are the natural fit for "round-trip must be identity"         |
| Lint      | ESLint 8 legacy config, wrong glob     | **ESLint 9 flat config** + `typescript-eslint` (`strictTypeChecked`), `eslint-plugin-import-x`; lints `src`, `test`, `examples`                      | Or Biome for lint+format in one tool if speed matters more than rule breadth |
| Format    | `prettier-eslint-cli`                  | Prettier 3 (`.editorconfig` kept)                                                                                                                    |                                                                              |
| Hooks     | husky 8 with 0.x scripts (inert)       | `lefthook` or `simple-git-hooks` running `lint-staged` → eslint + prettier + `vitest related`                                                        | Or drop local hooks entirely and rely on CI                                  |
| CI        | Travis (dead) + CodeQL                 | **GitHub Actions**: matrix Node 20/22/24 × lint/typecheck/test/build; `publint`; coverage upload; CodeQL kept                                        | Dependabot grouped monthly instead of daily                                  |
| Release   | release-it 15 + gh-pages docs          | `release-it` 20 or **Changesets**; `npm publish --provenance` from an Actions OIDC workflow; CHANGELOG generated                                     | Removes the need for a maintainer's npm token                                |
| Docs      | ESDoc (unmaintained)                   | **TypeDoc** → `docs/` on GitHub Pages via Actions; README rewritten with working examples that are type-checked as part of the test suite            |                                                                              |
| Examples  | `example/*.js` requiring `../dist/cjs` | `examples/*.ts` importing `fence.js` via workspace/self-reference (`"fence.js": "workspace:*"` or `exports` self-import); executed in CI             | Guarantees examples never rot again                                          |

Expected dev-dependency count: roughly 250–350 packages versus 1,619 today, which removes essentially all current audit findings.

---

## 7. Phased plan

Each phase ends with green CI on `master` and can ship independently.

| Phase                   | Scope                                                                                                                                           | Deliverable                                                   | Effort    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------- |
| **0. Stabilize v1**     | Replace `faker`, fix lint glob, fix benchmark path/Joi call, delete Travis, add a minimal Actions workflow. No API change.                      | `1.0.2`; a trustworthy baseline test suite to diff v2 against | ½ day     |
| **1. Toolchain swap**   | TypeScript, Vitest, ESLint 9, tsdown, `exports`, Actions matrix, hooks. Port existing JS to `.ts` with `any` where needed, no behaviour change. | `2.0.0-alpha.1` (types shipped, behaviour identical)          | 1 day     |
| **2. Core rewrite**     | `builder.ts`, `fence.ts`, `step.ts`, `result.ts`, `errors.ts` per §4.3–4.8. Typed fluent methods. Memoization rewrite.                          | `2.0.0-beta.1`; all §2.2 defects covered by regression tests  | 1½–2 days |
| **3. Serialization v2** | `serialize.ts`, tagged nested fences, legacy importer, property-based round-trip tests.                                                         | `2.0.0-beta.2`                                                | ½–1 day   |
| **4. Docs and release** | README, MIGRATING.md, TypeDoc, type-checked examples, CHANGELOG, provenance publish, `v1` maintenance branch.                                   | `2.0.0`                                                       | ½–1 day   |
| **5. Async (optional)** | `runAsync`, `AsyncValidator`.                                                                                                                   | `2.1.0`                                                       | ½ day     |

Total for 2.0: **4–6 days**. Phase 0 is worth doing even if the rest is deferred; it costs half a day and restores the ability to trust `npm test`.

---

## 8. Risks and open questions

1. **Fluent method attachment strategy.** `Object.defineProperty` per fork is O(|registry|) per operation; a `Proxy` is O(1) but adds a trap on every property access and complicates `instanceof`/debugging. Recommendation: start with `defineProperty` (registries are small; it is transparent in DevTools), keep the primitive `step()` as the fallback, and benchmark before choosing Proxy.
2. **Type-level complexity.** `FenceBuilder<R> & StepMethods<R>` intersections can produce long hover text. Mitigation: a named `Fluent<R>` alias and a `registry` getter so users can name their builder type (`type UserFence = Fluent<typeof base.registry>`).
3. **Vacuous truth for empty nested results.** Keeping v1 semantics is safest, but a `strict` run option that fails an empty nested array is cheap to add and worth considering during Phase 2.
4. **CJS consumers.** Dual publishing carries the dual-package hazard (two copies of the classes if both formats load). `instanceof Result` across formats would fail. Mitigation: document ESM as primary; consider ESM-only in 3.0 once Node 20 is EOL (April 2026 has passed, so this may already be acceptable for the project's audience).
5. **Name.** `fence.js` on npm is fine; the `Chain` remnants in CONTRIBUTING.md and `.esdoc.json` should go in Phase 4.

---

## Appendix A. Reproduction commands

```sh
npm ci --ignore-scripts
npx jest                         # sanity.test.js: "Cannot find module 'faker'"; Fence.js 0% covered
npm run lint                     # passes: only src/index.js is linted
npx eslint 'src/**/*.js'         # what the script should have run
npm audit                        # 111 vulnerabilities (13 critical) across 1,619 packages
node example/serialize.js        # double-encoded JSON output
node example/policy.js           # works only because it never round-trips through hydrate()
```

Behavioural defects C1–C9 were confirmed with a throwaway Jest probe (removed afterwards); each row in §2.2 quotes the observed value.
