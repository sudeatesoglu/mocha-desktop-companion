import type { MochaBridge, ReminderBridge, SettingsBridge } from '../shared/ipc-channels.ts';

declare global {
  interface Window {
    /**
     * Exposed by each window's own preload script; the page's only door to
     * the main process. `mocha` exists only in the overlay, `reminder` only
     * in the break reminder and `settings` only in the settings window.
     */
    readonly mocha: MochaBridge;
    readonly reminder: ReminderBridge;
    readonly settings: SettingsBridge;
  }
}
