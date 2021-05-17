# JS SONA TYPES

[![CircleCI](https://circleci.com/gh/sonatype-nexus-community/js-sona-types.svg?style=svg)](https://circleci.com/gh/sonatype-nexus-community/js-sona-types)

Hi, hello! This library is mostly for consumption by Sonatype projects that need a common way to talk to OSS Index, Nexus IQ, and etc...

## Development

To get started you'll need node, yarn, and that's about it!

### Building

- `yarn`
- `yarn build`

### Examples

In the `/examples` dir, there is a README that has examples of how to test that the project is working for both node, and React. Go browse there for more information!

## Releasing

We use [semantic-release](https://github.com/semantic-release/semantic-release) to generate releases
from commits to the `main` branch.

For example, to perform a "patch" release, add a commit to `main` with a comment like:

```
fix: Adds supercow flag, implements (#xyz)
```

To avoid performing a release after a commit to the `main` branch, be sure your commit message includes `[skip ci] `.
