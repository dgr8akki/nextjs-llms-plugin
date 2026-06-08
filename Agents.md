# Agents

This repository is a TypeScript package for generating `llms.txt` and `llms-full.txt` files during Next.js builds.

## Project Commands

- Install dependencies with `npm ci`.
- Run the full local check with `npm run check`.
- Run the real Next.js fixture check with `npm run smoke:next`.
- Build package artifacts with `npm run build`.
- Do not edit generated `dist/` files directly; change `src/` and rebuild.

## Release Process

1. Start from a clean working tree on `main`.
2. Run `npm ci`.
3. Run `npm run check`.
4. Run `npm run smoke:next`.
5. Bump the package version with `npm version patch`, `npm version minor`, or `npm version major`.
6. Push the commit and tag.
7. Create a GitHub release from the version tag.
8. The `Publish to npm` workflow runs checks, builds the package, performs `npm pack --dry-run`, and publishes with npm provenance.

The publish workflow requires an `NPM_TOKEN` repository secret with permission to publish this package.

## GitHub Actions

- `CI` runs on pushes to `main`, pull requests, and manual dispatch.
- `CI` runs typecheck, tests, build, and `npm pack --dry-run` on Node 20 and Node 22.
- `CI` also runs a Next.js smoke build on Node 22.
- `Publish to npm` runs when a GitHub release is published or manually dispatched.

## Notes for Future Agents

- Keep `README.md` focused on user-facing package usage.
- Keep this file focused on development, release, and automation notes.
- Prefer adding tests before changing scanner, parser, generator, or Next.js wrapper behavior.
- The smoke test creates and deletes a temporary Next.js app under the OS temp directory.
