import type { BrowserWindow } from 'electron';
import { createSecureWindow } from './create-secure-window.ts';
import { overlayWindowOptions, type Point } from './overlay-window-options.ts';

/**
 * Creates the desktop overlay: a transparent square at `position` that
 * floats above other apps and lets clicks pass through until the renderer
 * reports the cursor is over Mocha.
 */
export function createOverlayWindow(
  preloadPath: string,
  position: Point,
  platform: NodeJS.Platform,
): BrowserWindow {
  const window = createSecureWindow(overlayWindowOptions(platform, position), preloadPath, {
    activate: false,
  });

  // 'floating' sits above normal windows without covering system UI.
  window.setAlwaysOnTop(true, 'floating');
  // Follow the user across Spaces and over fullscreen apps. On macOS this
  // turns the app into a UI element: no Dock icon, as decided in ADR-0002.
  // Quitting is done from the tray menu (#25); in development, Ctrl+C.
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Click-through by default. `forward` still delivers mouse moves to the
  // renderer, so it can tell when the cursor reaches an opaque pixel.
  window.setIgnoreMouseEvents(true, { forward: true });

  return window;
}
