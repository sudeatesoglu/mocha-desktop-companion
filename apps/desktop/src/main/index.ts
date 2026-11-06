import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, Menu, nativeImage, screen, session, systemPreferences, Tray } from 'electron';
import { IpcChannel } from '../shared/ipc-channels.ts';
import { OVERLAY_SIZE } from '../shared/overlay.ts';
import { createPauseController } from './app-state/pause-controller.ts';
import { startCursorTracker } from './cursor/cursor-tracker.ts';
import { openDatabase } from './db/open-database.ts';
import { registerIpcHandlers } from './ipc/register-ipc-handlers.ts';
import { registerOverlayHandlers } from './ipc/register-overlay-handlers.ts';
import { createSettingsStore } from './settings/settings-store.ts';
import { watchSpaceChanges } from './space/space-watcher.ts';
import { trayIconBitmap } from './tray/tray-icon.ts';
import { trayMenuTemplate } from './tray/tray-menu.ts';
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

// Kept at module level: a tray that is garbage-collected disappears.
let tray: Tray | undefined;

function createTrayIcon() {
  const { width, height, data } = trayIconBitmap(2);
  const icon = nativeImage.createFromBitmap(Buffer.from(data), { width, height, scaleFactor: 2 });
  icon.setTemplateImage(true); // let macOS tint it for light and dark menu bars
  return icon;
}

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

    // Undefined if it cannot be opened: Mocha then runs without history.
    const database = openDatabase(join(app.getPath('userData'), 'mocha.db'), console);
    app.on('will-quit', () => database?.close());

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
    let remembered = saved.overlayPosition;
    const settle = (position: { x: number; y: number }) => {
      const placed = placeOnDisplays(position, OVERLAY_SIZE, workAreas());
      window.setPosition(placed.x, placed.y);
      // Display events can fire often; write only when the position changed.
      if (remembered?.x === placed.x && remembered.y === placed.y) return;
      remembered = placed;
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
    // If the renderer dies mid-drag, its "end" never arrives: stop following.
    window.webContents.on('render-process-gone', () => dragger.end());

    // A monitor was unplugged or rearranged: bring Mocha back on screen.
    const onDisplaysChanged = () => settle(windowPosition());
    screen.on('display-removed', onDisplaysChanged);
    screen.on('display-metrics-changed', onDisplaysChanged);

    const startTracking = () =>
      startCursorTracker({
        getCursor: () => screen.getCursorScreenPoint(),
        getOrigin: () => window.getContentBounds(),
        send: (point) => window.webContents.send(IpcChannel.OverlayCursor, point),
        every,
      });
    let stopCursorTracking: (() => void) | undefined = startTracking();

    // Pausing stops everything Mocha does: animation (in the overlay) and
    // cursor polling (here). Every dependent part subscribes to the change.
    const pause = createPauseController();
    pause.onChange((paused) => {
      window.webContents.send(IpcChannel.OverlayPaused, paused);
      if (paused) {
        stopCursorTracking?.();
        stopCursorTracking = undefined;
      } else {
        stopCursorTracking ??= startTracking();
      }
      updateTrayMenu();
    });

    app.setAboutPanelOptions({
      applicationName: 'Mocha',
      applicationVersion: app.getVersion(),
      credits: 'A pixel-art raven that keeps you company.',
    });
    tray = new Tray(createTrayIcon());
    tray.setToolTip('Mocha');
    function updateTrayMenu() {
      tray?.setContextMenu(
        Menu.buildFromTemplate(
          trayMenuTemplate(
            { paused: pause.paused },
            {
              togglePause: () => pause.toggle(),
              resetPosition: () =>
                settle(initialOverlayPosition(undefined, screen.getPrimaryDisplay().workArea, [])),
              quit: () => app.quit(),
            },
          ),
        ),
      );
    }
    updateTrayMenu();

    // The desktop slides under Mocha when the user switches Spaces.
    const stopWatchingSpaces = watchSpaceChanges(process.platform, systemPreferences, () =>
      window.webContents.send(IpcChannel.OverlaySpaceChanged),
    );

    window.on('closed', () => {
      stopWatchingSpaces();
      stopCursorTracking?.();
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
