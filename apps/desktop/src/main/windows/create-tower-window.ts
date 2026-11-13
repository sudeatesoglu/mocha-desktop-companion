import type { BrowserWindow } from 'electron';
import { createSecureWindow } from './create-secure-window.ts';

export const TOWER_WIDTH = 360;
export const TOWER_HEIGHT = 480;

/** Creates Mocha's Tower: an ordinary, fixed-size window that takes focus. */
export function createTowerWindow(preloadPath: string): BrowserWindow {
  return createSecureWindow(
    {
      width: TOWER_WIDTH,
      height: TOWER_HEIGHT,
      useContentSize: true, // the size of the page, not counting the title bar
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'Mocha’s Tower',
    },
    preloadPath,
  );
}
