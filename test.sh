#!/bin/sh

yarn run build 

yarn link

echo ">> NODE EXAMPLE <<"

cd examples/node && yarn link @sonatype/js-sona-types && yarn install --force && yarn start && cd -

echo ">> REACT EXAMPLE <<"

cd examples/react-test-app && yarn link @sonatype/js-sona-types && yarn install --force && yarn build && cd -

echo ">> NODE TS EXAMPLE <<"

cd examples/node-ts && yarn link @sonatype/js-sona-types && yarn install --force && yarn start && cd -
