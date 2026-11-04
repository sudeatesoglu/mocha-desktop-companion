# ADR-0005: pnpm workspace with a platform-free core package

- **Status:** Accepted
- **Date:** 2026-10-31

## Context

Mocha will consist of several deliverables with different runtimes: the Electron desktop app (main, preload and renderer), a browser extension later, and the game and habit rules they share. [ADR-0003](0003-single-state-in-main-process.md) places those rules in a pure reducer that must be testable without Electron.

In a single package nothing stops an Electron, Node or DOM import from creeping into the pure logic. A convention ("do not import Electron here") is only as strong as every reviewer's attention.

## Decision

We will organize the repository as a **pnpm workspace**:

```
apps/       runnable applications (desktop, later extension)
packages/   shared libraries
  core/     @mocha/core: pure game and habit logic
```

- **`@mocha/core` is platform-free by construction.** Its tsconfig enables no ambient types, so using a Node, DOM or Electron global is a type error. It has no runtime dependencies on those platforms.
- **Internal packages are consumed as TypeScript source.** `@mocha/core` exports `./src/index.ts` directly; the consuming app's bundler compiles it. There is no separate build or watch step for internal packages.
- **Each package exposes a single entry point.** Consumers import from `@mocha/core`, never from internal paths, so internals can be reorganized freely.
- **Shared tooling stays at the root:** one `tsconfig.base.json` with the strict compiler options, one Biome configuration, one commitlint configuration. Vitest runs every package as a project from the root with a single coverage report and thresholds.
- Root scripts run across all packages; `pnpm --filter <package> <script>` runs one.

## Alternatives considered

- **Single package with folder conventions:** simplest, but the boundary between pure logic and platform code is not enforced.
- **TypeScript project references with a build step per package:** stronger incremental builds, but adds `composite` configuration and a mandatory build before dependents can type-check. Not needed at this size; can be adopted later.
- **Turborepo or Nx:** task caching and orchestration help large monorepos. With a handful of packages, pnpm's recursive and filtered commands are enough, and avoid another tool.
- **Publishing internal packages with compiled `dist/` output:** needed only if they are consumed outside this repository.

## Consequences

- The functional core / imperative shell split is enforced by the compiler, not by review.
- Code in `@mocha/core` cannot use timers, `console` or other platform APIs directly; time and randomness are passed in as parameters, which also makes the logic deterministic in tests.
- Because internal packages ship TypeScript source, every consumer must be able to compile TypeScript (a bundler such as Vite, or Node's type stripping).
- Adding a package means adding its `package.json`, a tsconfig extending the base, and a Vitest project config.
