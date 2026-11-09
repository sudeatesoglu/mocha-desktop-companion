import type { BrowserWindow } from 'electron';
import { createSecureWindow } from './create-secure-window.ts';

export const SETTINGS_WIDTH = 380;
/** Room for every field with an error message under it. */
export const SETTINGS_HEIGHT = 480;

/**
 * Creates the settings window: an ordinary window that takes focus, since
 * the user types into it, unlike the overlay and the reminder.
 */
export function createSettingsWindow(preloadPath: string): BrowserWindow {
  return createSecureWindow(
    {
      width: SETTINGS_WIDTH,
      height: SETTINGS_HEIGHT,
      useContentSize: true, // the size of the page, not counting the title bar
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'Mocha Settings',
    },
    preloadPath,
  );
}
