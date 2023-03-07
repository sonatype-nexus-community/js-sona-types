// rollup.config.js

import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import sourcemaps from 'rollup-plugin-sourcemaps';
// import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json' assert { type: 'json' };


const config = [
  {
    input: './src/index.ts',

    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: pkg.module,
        format: 'esm',
        sourcemap: true,
      },
    ],

    external: [
      'browser-cookies',
      'cross-fetch',
      'packageurl-js',
      'https-proxy-agent',
      'dependency-graph',
      'xmlbuilder2',
      'ssri',
      'read-installed',
      'spdx-license-ids',
      'spdx-license-ids/deprecated',
      'node-get-random-values',
    ],

    plugins: [
      nodeResolve({
        extensions: [".js", ".jsx"],
      }),
      typescript(),
      sourcemaps(),
      babel({ inputSourceMap: false })
    ],
  },
  {
    input: './dist/types/index.d.ts',

    output: [
      {
        file: 'dist/index.d.ts',
        format: 'es',
      },
    ],

    plugins: [
      dts(),
      babel({ babelHelpers: 'bundled' })
    ],
  },
];

export default config;
