# ADR-0007: Store data with the built-in node:sqlite

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

From v0.2 Mocha keeps a history of work and break sessions, which stats and later features query. It must stay local, survive crashes and fit the fully bundled package from [ADR-0006](0006-package-with-electron-builder.md), which ships no `node_modules` and builds for two CPU architectures.

Electron 44 embeds Node 24, which includes `node:sqlite`. Its documentation marks it Stability 1.2, release candidate: close to stable, but its API can still change.

A check confirmed that it works in a packaged, fused, ad-hoc signed Apple Silicon build: writing to a file, WAL mode, commit, rollback and reopening. The Intel build uses the same mechanism but was not run.

## Decision

We will use **`node:sqlite`** in the main process, with hand-written SQL:

- **Migrations** are ordered SQL strings. Each runs in a transaction together with the `PRAGMA user_version` bump, so a failure leaves the database as it was. A database from a newer app version is refused rather than guessed at.
- **Repositories** own the SQL and use bound parameters only.
- **WAL journaling**, so a crash cannot corrupt committed data.
- **Failure is not fatal:** if the database cannot be opened or migrated, the problem is logged and Mocha runs without history. The file is never deleted.
- **Tests use real SQLite**, in memory or in a temporary folder, instead of mocks.

Renderers never touch the database; they go through validated IPC ([ADR-0003](0003-single-state-in-main-process.md)).

## Alternatives considered

- **better-sqlite3 with Drizzle** (the early plan): typed queries and a stable, widely used driver, but a native module must be built for each Electron version and architecture, needs an allowed install script, and has to live outside the bundle. The Drizzle version checked (0.45.4) listed no `node:sqlite` driver.
- **JSON files:** fine for settings, but a poor fit for a growing, queried history.
- **sql.js (WebAssembly):** no native code, but it holds the database in memory and writes the whole file back, which suits crash safety poorly.

## Consequences

- No new dependency, install script or packaging change.
- SQL is checked by tests, not by the compiler, so each repository needs tests against real SQLite.
- The API is not final. An Electron upgrade can change it, so a major upgrade must rerun these tests and the packaged check. If it becomes a problem, access is confined to `apps/desktop/src/main/db`, which limits the work of moving to another driver.
- The SQLite version follows Electron's Node version rather than our own choice.
