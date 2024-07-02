# Contributing

Want to contribute to Ethereal Nexus?

Ask support from our core team! Feel free to reach us directly.

_To better understand the scope of this project we advise everyone that wants to contribute to read our [Documentation](https://diconium.github.io/ethereal-nexus/setup/introduction/)!_

## Developing

- We follow trunk based development.
- The trunk branch is `main`
- Developments should be done via a new feature branch, and then a PR should be raised against `main`.
- All merged branches will be deployed into the development environment and later released.

To develop locally:

1. Clone the repository.
1. Create a new branch:
   ```
   git checkout -b feature/MY_BRANCH_NAME origin/main
   ```
1. Enable pnpm:
   ```
   corepack enable pnpm
   ```
1. Install the dependencies with:
   ```
   pnpm install
   ```
1. Start developing and watch for code changes on the desired package:
   ```
   pnpm dev
   ```
1. When your changes are finished, commit them to the branch and open a PR.
