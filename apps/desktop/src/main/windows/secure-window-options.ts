import type { BrowserWindowConstructorOptions, WebPreferences } from 'electron';

/** Window options a caller may choose. Web preferences are not negotiable. */
export type SafeWindowOptions = Omit<BrowserWindowConstructorOptions, 'webPreferences'>;

/**
 * The security baseline every window gets (ADR-0002).
 * See https://www.electronjs.org/docs/latest/tutorial/security
 */
export function secureWebPreferences(preloadPath: string): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true, // page scripts cannot reach preload or Electron internals
    sandbox: true, // renderer runs as an unprivileged OS process
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true, // keep the same-origin policy
    allowRunningInsecureContent: false,
    webviewTag: false, // <webview> can embed remote content with its own preferences
    navigateOnDragDrop: false, // dropping a file must not load it into the window
    spellcheck: false, // no dictionary downloads
  };
}

/**
 * Merges caller options with the security baseline. The baseline is applied
 * last, so even a caller that smuggles in `webPreferences` cannot weaken it.
 */
export function buildWindowOptions(
  options: SafeWindowOptions,
  preloadPath: string,
): BrowserWindowConstructorOptions {
  return {
    show: false, // shown on 'ready-to-show' to avoid a blank flash
    ...options,
    webPreferences: secureWebPreferences(preloadPath),
  };
}
