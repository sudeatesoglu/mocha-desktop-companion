# ADR-0006: Package with electron-builder as a fully bundled, fused app

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

Mocha must be installable as a normal macOS app. The build already produces bundled JavaScript with electron-vite ([ADR-0004](0004-canvas-2d-renderer-with-fixed-timestep-loop.md), [ADR-0005](0005-pnpm-workspace-layout.md)). Code signing with an Apple Developer ID and notarization are planned for v1.0; until then, builds are unsigned in the Apple sense.

Constraints:

- Apple Silicon refuses to run code without any signature at all.
- Internal workspace packages are consumed as TypeScript source and cannot be loaded from `node_modules` at runtime.
- A packaged Electron app can be abused to run an attacker's code under the app's identity (for example through `ELECTRON_RUN_AS_NODE`), which matters for an app that will later hold permissions such as reading idle time.

## Decision

We will package with **electron-builder**:

- **Targets:** DMG for `arm64` and `x64`; `LSUIElement` set so the app is a menu-bar app from the first moment.
- **Fully bundled:** every runtime dependency is a `devDependency`, so electron-vite bundles it into `out/`. The `app.asar` contains only `out/` and `package.json`: no `node_modules`, no sources, no tests.
- **Electron fuses** baked into the binary: `RunAsNode`, `EnableNodeOptionsEnvironmentVariable` and `EnableNodeCliInspectArguments` off; `EnableEmbeddedAsarIntegrityValidation`, `OnlyLoadAppFromAsar` and `EnableCookieEncryption` on.
- **Ad-hoc signature** (`identity: '-'`) so Apple Silicon runs the app; the hardened runtime stays off until a Developer ID signature exists, because with an ad-hoc signature it adds no protection and can stop the app from loading its own frameworks.
- Dependency install scripts stay blocked; electron-builder's transitive `electron-winstaller` script (Windows-only) is denied.

## Alternatives considered

- **Electron Forge:** the official toolchain, but it brings its own Vite and Webpack plugins that overlap with electron-vite, and DMG and fuse support need extra makers and plugins.
- **Shipping `node_modules`:** simpler bundler configuration, but larger packages, pnpm symlink issues, and workspace packages that are TypeScript source would not load.
- **No signature at all:** the app would not launch on Apple Silicon.

## Consequences

- Packages are self-contained and small apart from the Electron runtime itself (about 130 MB per DMG).
- Downloaded builds are quarantined by Gatekeeper and must be allowed once by the user (documented in the README) until Developer ID signing and notarization in v1.0. Then the hardened runtime is enabled.
- `GrantFileProtocolExtraPrivileges` stays on because the renderer is loaded from `file://`. Moving to a custom app protocol would allow turning it off; tracked in #45.
- Windows and Linux targets can be added to the same configuration later.
