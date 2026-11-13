import type {
  MochaBridge,
  ReminderBridge,
  SettingsBridge,
  TowerBridge,
} from '../shared/ipc-channels.ts';

declare global {
  interface Window {
    /**
     * Exposed by each window's own preload script; the page's only door to
     * the main process. `mocha` exists only in the overlay, `reminder` only
     * in the break reminder, `settings` only in the settings window and
     * `tower` only in the Tower.
     */
    readonly mocha: MochaBridge;
    readonly reminder: ReminderBridge;
    readonly settings: SettingsBridge;
    readonly tower: TowerBridge;
  }
}
