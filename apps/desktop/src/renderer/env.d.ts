import type { MochaBridge, ReminderBridge } from '../shared/ipc-channels.ts';

declare global {
  interface Window {
    /**
     * Exposed by each window's own preload script; the page's only door to
     * the main process. `mocha` exists only in the overlay and `reminder`
     * only in the break reminder.
     */
    readonly mocha: MochaBridge;
    readonly reminder: ReminderBridge;
  }
}
