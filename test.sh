#!/bin/sh

yarn run build && yarn unlink && yarn link

cd examples/node && yarn link @sonatype/js-sona-types && yarn install --force && yarn start
cd ../react-test-app && yarn link @sonatype/js-sona-types && yarn install --force && yarn build
cd ../node-ts && yarn link @sonatype/js-sona-types && yarn install --force && yarn start
