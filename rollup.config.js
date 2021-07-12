// rollup.config.js

import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
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
        sourcemap: "inline",
      },
      {
        file: pkg.module,
        format: 'esm',
        sourcemap: "inline",
      },
    ],

    external: ['axios', 'packageurl-js'],

    plugins: [
      resolve({ extensions }),
      typescript(),
      babel(
        { 
          babelHelpers: 'bundled', 
          include: ['src/**/*.ts'], 
          extensions, 
          exclude: './node_modules/**'
        }
      ),
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
