# fence.js

![Node](https://img.shields.io/node/v/fence.js.svg?style=flat-square)
[![NPM](https://img.shields.io/npm/v/fence.js.svg?style=flat-square)](https://www.npmjs.com/package/fence.js)
[![Travis](https://img.shields.io/travis/dotcarls/fence.js/master.svg?style=flat-square)](https://travis-ci.org/dotcarls/fence.js)
[![David](https://img.shields.io/david/dotcarls/fence.js.svg?style=flat-square)](https://david-dm.org/dotcarls/fence.js)
[![Coverage Status](https://img.shields.io/coveralls/dotcarls/fence.js.svg?style=flat-square)](https://coveralls.io/github/dotcarls/fence.js)

> A framework to create efficient and extensible validations

## Features

-   Flexible
-   Deterministic
-   Extendable
-   Persistable
-   Portable

## Overview

One problem with validation plugins, frameworks, etc. is that they are usually opinionated in some way -- they have an inflexible API, require certain dependencies, etc. This hampers reusability and introduces additional complexity as an application's validation requirements evolve over time. Further, if we wanted to conditionally validate certain attributes (i.e. allow an end user to 'configure' the validation), we would typically have to hard code this functionality into each validation.

The goal of this module is to solve these problems without getting in the way. By prioritizing validation composition over all else, this framework is ideal for creating complex validations that are both portable and maintainable.

## Usage

### Example
```js
const FenceBuilder = require('./lib');
const FB = new FenceBuilder();

FB.register('strictEqual', function (val1, val2) {
    return val1 === val2;
});

const validation = FB.fork().strictEqual('a').build();
console.log(`validation of "a": ${validation.run('a')}`);
console.log(`validation of "b": ${validation.run('b')}`);
```

A Fence begins with an instance of `FenceBuilder`. The general lifecycle of a `FenceBuilder` instance is: instantiation, registration, composition, and building.

### Instantiation

An instance can be created by creating a new `FenceBuilder`:

```js
// new FenceBuilder
const FB = new FenceBuilder();
```

An instance can also be created from existing instances of `FenceBuilder` via the `fork()` method:

```js
// new FenceBuilder
const FB = new FenceBuilder();

// someFence 'extends' FB
const someFence = FB.fork();

// anotherFence 'extends' someFence
const anotherFence = someFence.fork();
```

When an instance is `fork()`'d, its prototype is copied by reference and used to instantiate a new instance of `FenceBuilder` that is then returned. The result of calling`fork()` is a 'child' instance which can be acted on without affecting its parent.

### Registration

A fresh instance of `FenceBuilder` won't be able to do much -- we must 'register' functions so that they can be used during the composition phase. Registering a function will add an instance method to an instance of `FenceBuilder`. Doing so makes the registered function available for use during composition. To register a function, provide `register()` with a `name` and a function reference or declaration.

```js
// new FenceBuilder
const FB = new FenceBuilder();

FB.register('strictEqual', function(val1, val2) {
    return val1 === val2;
});
```

The `name` attribute is used to promote determinism in cases where function references can not be passed around. Consider the case where we want to validate something on the server and the client -- the server may have a `required` function available from `utils` and the client may have a `required` function available from `clientUitls`. If two named functions are functionally equivalent (produce the exact same output for every possible input) then we can say overall the validation is deterministic regardless of its execution context.

When registering a function, we accept a `name` and a function reference.  When these instance methods are called, they create an `Invokable` which represents a function and optionally some arguments.

### Examples

See [`example`](example/script.js) folder or the [runkit](https://runkit.com/dotcarls/fence.js) example.

### Builds

If you don't use a package manager, you can [access `fence.js` via unpkg (CDN)](https://unpkg.com/fence.js/), download the source, or point your package manager to the url.

`fence.js` is compiled as a collection of [CommonJS](http://webpack.github.io/docs/commonjs.html) modules & [ES2015 modules](http://www.2ality.com/2014/0
  -9/es6-modules-final.html) for bundlers that support the `jsnext:main` or `module` field in package.json (Rollup, Webpack 2)

The `fence.js` package includes precompiled production and development [UMD](https://github.com/umdjs/umd) builds in the [`dist` folder](https://unpkg.com/fence.js/dist/). They can be used directly without a bundler and are thus compatible with many popular JavaScript module loaders and environments. You can drop a UMD build as a [`<script>` tag](https://unpkg.com/fence.js) on your page. The UMD builds make `fence.js` available as a `window.fence.js` global variable.

### License

The code is available under the [MIT](LICENSE) license.

### Contributing

We are open to contributions, see [CONTRIBUTING.md](CONTRIBUTING.md) for more info.

### Misc

This module was created using [generator-module-boilerplate](https://github.com/duivvv/generator-module-boilerplate).
