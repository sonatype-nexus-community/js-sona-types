#!/bin/sh

cd examples/node && yarn install --force && yarn start
cd ../react-test-app && yarn install --force && yarn build
cd ../node-ts && yarn install --force && yarn start
