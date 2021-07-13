// rollup.config.js

import { babel } from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import sourcemaps from 'rollup-plugin-sourcemaps';
import pkg from './package.json';
import dts from "rollup-plugin-dts";
import typescript from 'rollup-plugin-typescript2';

const extensions = ['.js', '.ts' ];

const config = [
  {
    input: './src/index.ts',

    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: pkg.module,
        format: 'esm',
        sourcemap: true
      },
    ],

    external: ['axios', 'packageurl-js', 'https-proxy-agent'],

    plugins: [
      resolve({ extensions }),
      typescript({ sourceMap: true }),
      sourcemaps(),
      babel({ inputSourceMap: false }),
    ]
  },
  {
    input: "./dist/types/index.d.ts",

    output: [
      {
        file: "dist/index.d.ts", 
        format: "es" 
      }
    ],

    plugins: [
      dts(),
    ],
  },
];

export default config;
