# Mocha 🐾

> A cute desktop companion that lives in the corner of your screen, keeps you company and helps you build healthier work habits.

**Status:** 🚧 Planning. No usable release yet.

## Idea

Mocha is a small, Tamagotchi-like character that sits in the bottom-right corner of your desktop. It reacts to what you do: it follows your cursor, notices when you've been staring at the screen for too long and reminds you to take a break, and over time learns your habits to offer a more personal experience.

## Principles

- **Local-first & private:** your activity data stays on your machine.
- **Delightful, not annoying:** gentle nudges, never nagging.
- **Small and focused:** ship a lovable core first, grow from there.

## Getting started

### Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 24 LTS | Pinned in `.node-version` (read by fnm, mise and asdf; with nvm run `nvm install 24 && nvm use 24`) |
| [pnpm](https://pnpm.io) | 12.x | Exact version pinned in `package.json` (`packageManager`); pnpm switches to it automatically |

### Setup

```bash
git clone https://github.com/sudeatesoglu/mocha-desktop-companion.git
cd mocha-desktop-companion
pnpm install   # also installs Git hooks (Lefthook)
```

### Repository layout

This is a [pnpm workspace](https://pnpm.io/workspaces) (see [ADR-0005](docs/adr/0005-pnpm-workspace-layout.md)):

| Path | Package | Contents |
| --- | --- | --- |
| `packages/core` | `@mocha/core` | Pure game and habit logic. No Electron, DOM or Node APIs, enforced by its tsconfig |
| `apps/desktop` | `@mocha/desktop` | The Electron app: main process, sandboxed preload bridge and renderer, built with [electron-vite](https://electron-vite.org) |
| `docs/adr/` | | Architecture Decision Records |

### Scripts

Run from the repository root; they cover every workspace package.

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the desktop app with hot reload (downloads the Electron binary on first run) |
| `pnpm lint` | Check linting, formatting and import order (read-only, fails on warnings) |
| `pnpm lint:fix` | Apply safe lint fixes, formatting and import order |
| `pnpm test` | Run unit tests once |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with a coverage report (`coverage/`), enforcing 80% thresholds |
| `pnpm typecheck` | Type-check the root config files and every package |
| `pnpm build` | Build every package that has a `build` script (desktop output goes to `apps/desktop/out/`) |

To run a script in a single package, use a filter, e.g. `pnpm --filter @mocha/core test`.

### Testing conventions

- Tests live next to the code they cover: `foo.ts` → `foo.test.ts`.
- Keep business logic in `@mocha/core` (no Electron or OS APIs) so it can be unit-tested in isolation. Platform code only calls into it.
- Coverage must stay at or above 80% for lines, branches, functions and statements.

### Editor setup

Install the recommended VS Code extensions when prompted (Biome, EditorConfig). TypeScript, JavaScript, JSON and CSS files are formatted and fixed on save using the shared settings in `.vscode/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, commit conventions and Git hooks.

## Roadmap

The project scope and roadmap are being planned. See the [Issues](https://github.com/sudeatesoglu/mocha-desktop-companion/issues) for progress.
