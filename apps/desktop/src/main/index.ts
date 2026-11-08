import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_BREAK_CONFIG, breakConfig as makeBreakConfig } from '@mocha/core';
import {
  app,
  type BrowserWindow,
  Menu,
  nativeImage,
  powerMonitor,
  screen,
  session,
  systemPreferences,
  Tray,
} from 'electron';
import { IpcChannel } from '../shared/ipc-channels.ts';
import { OVERLAY_SIZE } from '../shared/overlay.ts';
import { REMINDER_HEIGHT, REMINDER_WIDTH, type ReminderShow } from '../shared/reminder.ts';
import { createActivityTracker } from './activity/activity-tracker.ts';
import { createBreakController } from './activity/break-controller.ts';
import { createChangeReporter } from './activity/change-reporter.ts';
import { createPauseController } from './app-state/pause-controller.ts';
import { startCursorTracker } from './cursor/cursor-tracker.ts';
import { openDatabase } from './db/open-database.ts';
import { registerIpcHandlers } from './ipc/register-ipc-handlers.ts';
import { registerOverlayHandlers } from './ipc/register-overlay-handlers.ts';
import { registerReminderHandlers } from './ipc/register-reminder-handlers.ts';
import { type DueState, reminderInfo } from './reminder/reminder-info.ts';
import { reminderPosition } from './reminder/reminder-placement.ts';
import { reminderTransition } from './reminder/reminder-transition.ts';
import { createSettingsStore } from './settings/settings-store.ts';
import { watchSpaceChanges } from './space/space-watcher.ts';
import { trayIconBitmap } from './tray/tray-icon.ts';
import { trayMenuTemplate } from './tray/tray-menu.ts';
import { createOverlayWindow } from './windows/create-overlay-window.ts';
import { createReminderWindow } from './windows/create-reminder-window.ts';
import { initialOverlayPosition, placeOnDisplays } from './windows/overlay-placement.ts';
import { createWindowDragger } from './windows/window-dragger.ts';

// Composition root: wires Electron to the app's modules. Logic lives in
// the imported modules, which are unit-tested; this file stays thin.

const preloadPath = join(import.meta.dirname, '../preload/index.cjs');
const rendererFile = join(import.meta.dirname, '../renderer/index.html');
const reminderPreloadPath = join(import.meta.dirname, '../preload/reminder.cjs');
const reminderFile = join(import.meta.dirname, '../renderer/reminder.html');
// Set by electron-vite in development only.
const devServerUrl = app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL'];
const reminderUrl = devServerUrl
  ? new URL('reminder.html', devServerUrl).href
  : pathToFileURL(reminderFile).href;

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
    // Work and breaks: the system idle time drives the break rules. Only
    // the duration since the last input is read, never what the input was.
    // In development, MOCHA_DEV_WORK_MS shortens the work stretch so the
    // reminder can be tried without waiting. Packaged builds ignore it.
    const devWorkMs = devServerUrl ? Number(process.env['MOCHA_DEV_WORK_MS']) : Number.NaN;
    const breakConfig =
      devWorkMs > 0 && Number.isFinite(devWorkMs)
        ? makeBreakConfig({ workMs: devWorkMs })
        : DEFAULT_BREAK_CONFIG;
    const breaks = createBreakController(breakConfig, Date.now());
    const awayReporter = createChangeReporter<boolean>((away) =>
      window.webContents.send(IpcChannel.OverlayAway, away),
    );
    const activity = createActivityTracker(
      {
        now: () => Date.now(),
        systemIdleMs: () => powerMonitor.getSystemIdleTime() * 1_000,
        every,
        awayAfterMs: breakConfig.idleBreakMs,
      },
      (sample) => {
        breaks.dispatch({ type: 'tick', now: sample.now, idleMs: sample.idleMs });
        awayReporter.report(sample.away);
      },
    );
    activity.start();

    // The break reminder: a bubble next to Mocha while a break is due. It
    // closes on its own when the state leaves "due" (a choice, walking away
    // or a pause), so the break rules stay the single source of truth.
    let reminder: BrowserWindow | undefined;
    let reminderShow: ReminderShow | undefined;
    const placeReminder = () => {
      const bounds = window.getBounds();
      return reminderPosition(
        bounds,
        { width: REMINDER_WIDTH, height: REMINDER_HEIGHT },
        screen.getDisplayMatching(bounds).workArea,
      );
    };
    const openReminder = (state: DueState) => {
      const placed = placeReminder();
      reminderShow = { ...reminderInfo(state, breakConfig), side: placed.side };
      const opened = createReminderWindow(reminderPreloadPath, placed, process.platform);
      reminder = opened;
      // The page shows nothing until this arrives, so it never flashes empty.
      opened.webContents.once('did-finish-load', () =>
        opened.webContents.send(IpcChannel.ReminderShow, reminderShow),
      );
      opened.on('closed', () => {
        if (reminder === opened) reminder = undefined;
      });
      if (devServerUrl) {
        opened.loadURL(reminderUrl);
      } else {
        opened.loadFile(reminderFile);
      }
    };
    const closeReminder = () => {
      reminder?.close();
      reminder = undefined;
    };
    /** Mocha moved: the bubble follows, switching sides if it must. */
    const followMocha = () => {
      if (!reminder || !reminderShow) return;
      const placed = placeReminder();
      reminder.setPosition(placed.x, placed.y);
      if (placed.side === reminderShow.side) return;
      reminderShow = { ...reminderShow, side: placed.side };
      reminder.webContents.send(IpcChannel.ReminderShow, reminderShow);
    };
    window.on('move', followMocha);
    breaks.onChange((next, previous) => {
      const transition = reminderTransition(next, previous);
      if (transition === 'open' && next.phase === 'due') openReminder(next);
      if (transition === 'close') closeReminder();
    });
    registerReminderHandlers(
      () => reminder?.webContents,
      (choice) => breaks.dispatch({ type: choice, now: Date.now() }),
      [reminderUrl],
      console,
    );

    const markAway = () => activity.markAway();
    powerMonitor.on('suspend', markAway);
    powerMonitor.on('lock-screen', markAway);

    const pause = createPauseController();
    pause.onChange((paused) => {
      window.webContents.send(IpcChannel.OverlayPaused, paused);
      breaks.dispatch({ type: paused ? 'pause' : 'resume', now: Date.now() });
      if (paused) {
        stopCursorTracking?.();
        stopCursorTracking = undefined;
        activity.stop();
        // The overlay may still think the user is away: after resuming,
        // the first sample is sent even if it did not change.
        awayReporter.reset();
      } else {
        stopCursorTracking ??= startTracking();
        activity.start();
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
      closeReminder();
      activity.stop();
      powerMonitor.off('suspend', markAway);
      powerMonitor.off('lock-screen', markAway);
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
