# ADR-0002: Electron shell with a transparent overlay window

- **Status:** Accepted
- **Date:** 2026-10-20

## Context

Mocha is a desktop companion: a small pixel-art character that lives on top of other applications, follows the cursor, notices when the user is away and can be dragged around. The project is TypeScript and Node based, targets macOS first and must stay portable to Windows and Linux later.

Hard requirements for the shell:

- a frameless, fully transparent window that stays above other applications, including fullscreen ones
- clicks on transparent pixels must reach the application underneath, so the character never blocks the desktop
- the global cursor position and the system idle time must be readable without recording keystrokes
- no Dock icon: the companion behaves like a desk accessory, not a regular app

A throwaway spike validated each requirement on macOS before this decision.

## Decision

We will build the desktop app on **Electron** and render the character in a dedicated overlay window:

- `BrowserWindow` with `transparent: true`, `frame: false`, `hasShadow: false` and `type: 'panel'`, kept above other windows with `setAlwaysOnTop(true, 'floating')` and `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`
- click-through by default via `setIgnoreMouseEvents(true, { forward: true })`; the renderer hit-tests the cursor against the sprite's pixel alpha and asks the main process to make the window interactive only while the cursor is over an opaque pixel
- the main process polls `screen.getCursorScreenPoint()` and forwards the position only when it changes, because a renderer receives mouse events only while the cursor is over its own window
- idle detection through `powerMonitor.getSystemIdleTime()`, which reports inactivity without reading any input
- `app.dock.hide()` and `app.requestSingleInstanceLock()`, so there is never more than one companion and no Dock icon

Every window uses the same security baseline: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, a strict Content Security Policy, and a preload script that exposes a small, explicit API through `contextBridge` instead of `ipcRenderer` itself. The main process validates every IPC message as untrusted input.

## Alternatives considered

- **Tauri:** smaller binaries, but the backend is Rust and transparent click-through overlays need platform-specific work. It conflicts with the TypeScript and Node constraint.
- **A native app per platform (Swift, C#):** best integration, but multiplies the codebase per operating system and leaves the Node ecosystem.
- **A browser extension only:** cannot draw outside the browser or read system idle time.

## Consequences

- One TypeScript codebase across the main process, preload scripts and renderers.
- Electron ships a full Chromium runtime, so the installer and memory footprint are larger than a native app. Rendering cost must be kept low on purpose (see [ADR-0004](0004-canvas-2d-renderer-with-fixed-timestep-loop.md)).
- The overlay has no menu and no Dock icon, so it is hard to quit. A tray menu with a Quit item is required from the first release.
- Moving between macOS Spaces shows the overlay with a short delay caused by the system's Space transition. This is accepted.
- Windows and Linux overlay behavior still has to be verified before those platforms are supported.
