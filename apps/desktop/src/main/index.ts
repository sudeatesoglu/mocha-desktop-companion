import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, screen, session } from 'electron';
import { IpcChannel } from '../shared/ipc-channels.ts';
import { OVERLAY_SIZE } from '../shared/overlay.ts';
import { startCursorTracker } from './cursor/cursor-tracker.ts';
import { registerIpcHandlers } from './ipc/register-ipc-handlers.ts';
import { registerOverlayHandlers } from './ipc/register-overlay-handlers.ts';
import { createSettingsStore } from './settings/settings-store.ts';
import { createOverlayWindow } from './windows/create-overlay-window.ts';
import { initialOverlayPosition, placeOnDisplays } from './windows/overlay-placement.ts';
import { createWindowDragger } from './windows/window-dragger.ts';

// Composition root: wires Electron to the app's modules. Logic lives in
// the imported modules, which are unit-tested; this file stays thin.

const preloadPath = join(import.meta.dirname, '../preload/index.cjs');
const rendererFile = join(import.meta.dirname, '../renderer/index.html');
// Set by electron-vite in development only.
const devServerUrl = app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL'];

const every = (ms: number, callback: () => void) => {
  const id = setInterval(callback, ms);
  return () => clearInterval(id);
};

const workAreas = () => screen.getAllDisplays().map((display) => display.workArea);

// Only one Mocha at a time: a second launch exits immediately.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    // Deny every permission request (camera, notifications, geolocation...).
    // Features that need one will allow it explicitly (least privilege).
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);

    const trustedUrls = [devServerUrl ?? pathToFileURL(rendererFile).href];
    registerIpcHandlers(trustedUrls, console);

    const settings = createSettingsStore(
      join(app.getPath('userData'), 'settings.json'),
      {
        read: (path) => readFile(path, 'utf8'),
        write: (path, data) => writeFile(path, data, 'utf8'),
        rename,
      },
      console,
    );
    const saved = await settings.load();

    const window = createOverlayWindow(
      preloadPath,
      initialOverlayPosition(
        saved.overlayPosition,
        screen.getPrimaryDisplay().workArea,
        workAreas(),
      ),
      process.platform,
    );
    const windowPosition = () => {
      const [x = 0, y = 0] = window.getPosition();
      return { x, y };
    };

    /** Keeps Mocha fully visible and remembers where it is. */
    const settle = (position: { x: number; y: number }) => {
      const placed = placeOnDisplays(position, OVERLAY_SIZE, workAreas());
      window.setPosition(placed.x, placed.y);
      void settings.update({ overlayPosition: placed });
    };

    const dragger = createWindowDragger({
      getCursor: () => screen.getCursorScreenPoint(),
      getPosition: windowPosition,
      setPosition: ({ x, y }) => window.setPosition(x, y),
      every,
      onDrop: settle,
    });
    registerOverlayHandlers(window, dragger, trustedUrls, console);

    // A monitor was unplugged or rearranged: bring Mocha back on screen.
    const onDisplaysChanged = () => settle(windowPosition());
    screen.on('display-removed', onDisplaysChanged);
    screen.on('display-metrics-changed', onDisplaysChanged);

    const stopCursorTracking = startCursorTracker({
      getCursor: () => screen.getCursorScreenPoint(),
      getOrigin: () => window.getContentBounds(),
      send: (point) => window.webContents.send(IpcChannel.OverlayCursor, point),
      every,
    });
    window.on('closed', () => {
      stopCursorTracking();
      screen.off('display-removed', onDisplaysChanged);
      screen.off('display-metrics-changed', onDisplaysChanged);
    });

    if (devServerUrl) {
      window.loadURL(devServerUrl);
    } else {
      window.loadFile(rendererFile);
    }
  });

  app.on('window-all-closed', () => app.quit());
}
