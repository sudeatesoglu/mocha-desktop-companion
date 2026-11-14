import type { BrowserWindow } from 'electron';
import { REMINDER_HEIGHT, REMINDER_WIDTH } from '../../shared/reminder.ts';
import { createSecureWindow } from './create-secure-window.ts';

/**
 * Creates the break reminder bubble: transparent, floating next to Mocha on
 * every Space, and never taking keyboard focus, so it cannot interrupt
 * typing. Its first click still reaches the page (acceptFirstMouse).
 */
export function createReminderWindow(
  preloadPath: string,
  position: { x: number; y: number },
  platform: NodeJS.Platform,
): BrowserWindow {
  const window = createSecureWindow(
    {
      ...position,
      width: REMINDER_WIDTH,
      height: REMINDER_HEIGHT,
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
      title: 'Mocha: break reminder',
      ...(platform === 'darwin' ? { type: 'panel' } : {}),
    },
    preloadPath,
    { activate: false },
  );
  window.setAlwaysOnTop(true, 'floating');
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  return window;
}
