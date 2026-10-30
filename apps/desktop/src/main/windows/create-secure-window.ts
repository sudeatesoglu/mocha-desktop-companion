import { BrowserWindow } from 'electron';
import { buildWindowOptions, type SafeWindowOptions } from './secure-window-options.ts';

/**
 * The only way the app creates windows. Every window gets the security
 * baseline and cannot navigate away or open new windows.
 */
export function createSecureWindow(options: SafeWindowOptions, preloadPath: string): BrowserWindow {
  const window = new BrowserWindow(buildWindowOptions(options, preloadPath));

  // Our renderers are single pages: any navigation or popup is unexpected.
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (options.show !== true) window.once('ready-to-show', () => window.show());
  return window;
}
