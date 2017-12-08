# Chain

![Node](https://img.shields.io/node/v/Chain.svg?style=flat-square)
[![NPM](https://img.shields.io/npm/v/Chain.svg?style=flat-square)](https://www.npmjs.com/package/Chain)
[![Travis](https://img.shields.io/travis/dotcarls/Chain/master.svg?style=flat-square)](https://travis-ci.org/dotcarls/Chain)
[![David](https://img.shields.io/david/dotcarls/Chain.svg?style=flat-square)](https://david-dm.org/dotcarls/Chain)
[![Coverage Status](https://img.shields.io/coveralls/dotcarls/Chain.svg?style=flat-square)](https://coveralls.io/github/dotcarls/Chain)

> A framework to create efficient and extensible validations

### Usage

```js
import Chain from 'Chain';

```

### Installation

Install via [yarn](https://github.com/yarnpkg/yarn)

	yarn add Chain (--dev)

or npm

	npm install Chain (--save-dev)


### configuration

You can pass in extra options as a configuration object (➕ required, ➖ optional, ✏️ default).

```js
import Chain from 'Chain';

```

➖ **property** ( type ) ` ✏️ default `
<br/> 📝 description
<br/> ❗️ warning
<br/> ℹ️ info
<br/> 💡 example

### methods

#### #name

```js
Chain

```

### Examples

See [`example`](example/script.js) folder or the [runkit](https://runkit.com/dotcarls/Chain) example.

### Builds

If you don't use a package manager, you can [access `Chain` via unpkg (CDN)](https://unpkg.com/Chain/), download the source, or point your package manager to the url.

`Chain` is compiled as a collection of [CommonJS](http://webpack.github.io/docs/commonjs.html) modules & [ES2015 modules](http://www.2ality.com/2014/0
  -9/es6-modules-final.html) for bundlers that support the `jsnext:main` or `module` field in package.json (Rollup, Webpack 2)

The `Chain` package includes precompiled production and development [UMD](https://github.com/umdjs/umd) builds in the [`dist` folder](https://unpkg.com/Chain/dist/). They can be used directly without a bundler and are thus compatible with many popular JavaScript module loaders and environments. You can drop a UMD build as a [`<script>` tag](https://unpkg.com/Chain) on your page. The UMD builds make `Chain` available as a `window.Chain` global variable.

### License

The code is available under the [MIT](LICENSE) license.

### Contributing

We are open to contributions, see [CONTRIBUTING.md](CONTRIBUTING.md) for more info.

### Misc

This module was created using [generator-module-boilerplate](https://github.com/duivvv/generator-module-boilerplate).
