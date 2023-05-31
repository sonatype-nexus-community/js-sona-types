#!/bin/sh

yarn run build 

yarn link

echo ">> NODE EXAMPLE <<"

cd examples/node && yarn link @sonatype/js-sona-types && yarn install --force && yarn start

echo ">> REACT EXAMPLE <<"

cd ../react-test-app && yarn link @sonatype/js-sona-types && yarn install --force && yarn build

echo ">> NODE TS EXAMPLE <<"

cd ../node-ts && yarn link @sonatype/js-sona-types && yarn install --force && yarn start
