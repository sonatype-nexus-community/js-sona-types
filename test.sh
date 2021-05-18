#!/bin/sh

yarn run build 

yarn unlink @sonatype/js-sona-types | true && yarn link @sonatype/js-sona-types

cd examples/node && yarn link @sonatype/js-sona-types && yarn install --force && yarn start
cd ../react-test-app && yarn link @sonatype/js-sona-types && yarn install --force && yarn build
cd ../node-ts && yarn link @sonatype/js-sona-types && yarn install --force && yarn start
