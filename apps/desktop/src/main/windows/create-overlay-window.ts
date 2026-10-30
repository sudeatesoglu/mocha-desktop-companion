import type { BrowserWindow } from 'electron';
import { OVERLAY_MARGIN, OVERLAY_SIZE } from '../../shared/overlay.ts';
import { createSecureWindow } from './create-secure-window.ts';
import { bottomRightPosition, overlayWindowOptions, type Rect } from './overlay-window-options.ts';

/**
 * Creates the desktop overlay: a transparent square in the bottom-right of
 * the given work area that floats above other apps and lets clicks pass
 * through until the renderer reports the cursor is over Mocha.
 */
export function createOverlayWindow(
  preloadPath: string,
  workArea: Rect,
  platform: NodeJS.Platform,
): BrowserWindow {
  const position = bottomRightPosition(workArea, OVERLAY_SIZE, OVERLAY_MARGIN);
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
