import type { BrowserWindow } from 'electron';
import { createSecureWindow } from './create-secure-window.ts';

/**
 * Creates a speech bubble next to Mocha, such as the break reminder or the
 * ritual: transparent, floating on every Space, and never taking keyboard
 * focus, so it cannot interrupt typing. Its first click still reaches the
 * page (acceptFirstMouse).
 */
export function createBubbleWindow(
  preloadPath: string,
  position: { x: number; y: number },
  bubble: { width: number; height: number; title: string },
  platform: NodeJS.Platform,
): BrowserWindow {
  const window = createSecureWindow(
    {
      ...position,
      width: bubble.width,
      height: bubble.height,
      transparent: true,
      frame: false,
      hasShadow: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: false,
      acceptFirstMouse: true,
      title: bubble.title,
      ...(platform === 'darwin' ? { type: 'panel' } : {}),
    },
    preloadPath,
    { activate: false },
  );
  window.setAlwaysOnTop(true, 'floating');
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  return window;
}
