import { BrowserWindow } from 'electron';
import { buildWindowOptions, type SafeWindowOptions } from './secure-window-options.ts';

export interface CreateWindowBehavior {
  /**
   * Whether showing the window takes keyboard focus. Ambient windows such
   * as the overlay must not steal focus from the app the user is typing in.
   */
  activate?: boolean;
}

/**
 * The only way the app creates windows. Every window gets the security
 * baseline and cannot navigate away or open new windows.
 */
export function createSecureWindow(
  options: SafeWindowOptions,
  preloadPath: string,
  { activate = true }: CreateWindowBehavior = {},
): BrowserWindow {
  const window = new BrowserWindow(buildWindowOptions(options, preloadPath));

  // Our renderers are single pages: any navigation or popup is unexpected.
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (options.show !== true) {
    window.once('ready-to-show', () => (activate ? window.show() : window.showInactive()));
  }
  return window;
}
