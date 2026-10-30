import { join } from 'node:path';
import { app, session } from 'electron';
import { createSecureWindow } from './windows/create-secure-window.ts';

// Composition root: wires Electron to the app's modules. Logic lives in
// the imported modules, which are unit-tested; this file stays thin.

const preloadPath = join(import.meta.dirname, '../preload/index.cjs');
const rendererFile = join(import.meta.dirname, '../renderer/index.html');
// Set by electron-vite in development only.
const devServerUrl = app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL'];

// Only one Mocha at a time: a second launch exits immediately.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    // Deny every permission request (camera, notifications, geolocation...).
    // Features that need one will allow it explicitly (least privilege).
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);

    const window = createSecureWindow(
      { width: 360, height: 240, title: 'Mocha', resizable: false },
      preloadPath,
    );
    if (devServerUrl) {
      window.loadURL(devServerUrl);
    } else {
      window.loadFile(rendererFile);
    }
  });

  app.on('window-all-closed', () => app.quit());
}
