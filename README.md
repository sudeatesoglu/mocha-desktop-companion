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
pnpm install
```

### Scripts

| Command | Description |
| --- | --- |
| `pnpm typecheck` | Type-check the project without emitting files |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm clean` | Remove build output |

## Roadmap

The project scope and roadmap are being planned. See the [Issues](https://github.com/sudeatesoglu/mocha-desktop-companion/issues) for progress.
