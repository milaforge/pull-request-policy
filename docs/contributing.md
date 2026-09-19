# Contributing

## Local setup

```bash
pnpm install
```

## Standard checks

```bash
pnpm run lint
pnpm run test
pnpm run coverage
pnpm run validate
pnpm run build
```

`pnpm run check` runs lint, formatting checks, typecheck, tests, coverage, and bundle generation.

## Release flow

1. Merge the intended changes to `main`.
2. Update `package.json` to the release version before merge.
3. Run the `release` workflow manually from `main`.
4. The workflow reads the version from `package.json`, validates source, creates a release commit on `release`, tags `vX.Y.Z`, and moves `vX`.
