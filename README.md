# JS SONA TYPES

[![CircleCI](https://circleci.com/gh/sonatype-nexus-community/js-sona-types.svg?style=svg)](https://circleci.com/gh/sonatype-nexus-community/js-sona-types)

Hi, hello! This library is mostly for consumption by Sonatype projects that need a common way to talk to OSS Index, Nexus IQ, and etc...

## Goals

`js-sona-types` is just a library, meant to be used by our JavaScript/TypeScript projects so that we can share some common code around communicating with OSS Index, Nexus IQ Server, etc...

Since we also include examples, there are a few living breathing sub projects that show how to use it.

This project started in Developer Experience and was primarily focused on getting the following projects to share common communication code:

- `vscode-iq-plugin`
- `auditjs`
- `nexus-iq-chrome-extension`

### Surface area

There are lots of things we do that are similar in each project. However creating a common library for browser, node, etc... in JS can be complicated. The goal realistically is to limit the surface area of this project to areas we can easily rip out of the projects, and have be beneficial for all projects.

## Development

To get started you'll need node, yarn, and that's about it!

### Building

- `yarn`
- `yarn build`

### Examples

In the `/examples` dir, there is a README that has examples of how to test that the project is working for both node, and React. Go browse there for more information!

You can see if the examples are working by running in the root of this project:

- `yarn run ci`

Alternatively you can look at `test.sh` to see the "magic" we are running to locally link the library in case you want to run only one project.

## Releasing

We use [semantic-release](https://github.com/semantic-release/semantic-release) to generate releases
from commits to the `main` branch.

For example, to perform a "patch" release, add a commit to `main` with a comment like:

```
fix: Adds supercow flag, implements (#xyz)
```

To avoid performing a release after a commit to the `main` branch, be sure your commit message includes `[skip ci] `.

## Need Help?

Internal folks, reach out to the Developer Experience team. Filing an issue here is good too!

External folks, file an issue here!
