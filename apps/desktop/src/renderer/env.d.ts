import type {
  CommentBridge,
  MochaBridge,
  ReminderBridge,
  RitualBridge,
  SettingsBridge,
  TowerBridge,
} from '../shared/ipc-channels.ts';

declare global {
  interface Window {
    /**
     * Exposed by each window's own preload script; the page's only door to
     * the main process. `mocha` exists only in the overlay, `reminder` only
     * in the break reminder, `ritual` only in the ritual bubble, `comment`
     * only in the comment bubble, `settings` only in the settings window and
     * `tower` only in the Tower.
     */
    readonly comment: CommentBridge;
    readonly mocha: MochaBridge;
    readonly reminder: ReminderBridge;
    readonly ritual: RitualBridge;
    readonly settings: SettingsBridge;
    readonly tower: TowerBridge;
  }
}
