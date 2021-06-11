import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import filesize from 'rollup-plugin-filesize';

const name = `fence`;

const plugins = [
    babel(),
    nodeResolve({
        module: true,
        jsnext: true
    }),
    commonjs({
        include: `node_modules/**`
    }),
    filesize()
];

const isProd = process.env.NODE_ENV === `production`;
// if (isProd) plugins.push(uglify());

export default {
    input: `src/index.js`,
    plugins,
    output: {
        name,
        format: `umd`,
        file: `dist/${name}${isProd ? `.min` : ``}.js`
    }
};
