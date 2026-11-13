import type { Preferences } from './preferences.ts';
import type { ReminderChoice, ReminderShow } from './reminder.ts';
import type { TowerAction, TowerView } from './tower.ts';

/**
 * IPC channel names shared by the main process and the preload script.
 *
 * Kept free of dependencies so the preload bundle stays tiny. Payload
 * schemas live in the main process, which is the only side that validates.
 */
export const IpcChannel = {
  /** Renderer → main (send): report a renderer error to the main-process log. */
  ReportRendererError: 'app:report-renderer-error',
  /** Overlay → main (send): whether the cursor is over Mocha's pixels. */
  SetOverlayInteractive: 'overlay:set-interactive',
  /** Overlay → main (send): "start" or "end" of dragging Mocha around. */
  DragOverlay: 'overlay:drag',
  /** Main → overlay: cursor position relative to the window, sent when it changes. */
  OverlayCursor: 'overlay:cursor',
  /** Main → overlay: Mocha was paused (true) or resumed (false) from the tray. */
  OverlayPaused: 'overlay:paused',
  /** Main → overlay: the user switched to another Space (macOS). */
  OverlaySpaceChanged: 'overlay:space-changed',
  /** Main → overlay: the user went away (true) or came back (false). */
  OverlayAway: 'overlay:away',
  /** Overlay → main (send): Mocha was double-clicked; open its Tower. */
  OpenTower: 'overlay:open-tower',
  /** Main → overlay: Mocha's energy fell below (true) or rose above (false) the tired line. */
  OverlayTired: 'overlay:tired',
  /** Overlay → main (send): the user petted Mocha on the desktop. */
  OverlayPetted: 'overlay:petted',
  /** Main → tower: Mocha's needs, sent when the page loads and when they change. */
  TowerNeeds: 'tower:needs',
  /** Tower → main (send): pet, treat or rest together. */
  TowerAct: 'tower:act',
  /** Main → reminder: what to show (work and break durations). */
  ReminderShow: 'reminder:show',
  /** Reminder → main (send): the user's answer: accept, snooze or dismiss. */
  ReminderChoose: 'reminder:choose',
  /** Settings → main (invoke): the current preferences. */
  SettingsLoad: 'settings:load',
  /** Settings → main (invoke): save and apply preferences; resolves to whether they were saved. */
  SettingsSave: 'settings:save',
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];

export interface RendererErrorReport {
  message: string;
  source?: string;
}

/** The API the preload script exposes to renderers as `window.mocha`. */
export interface MochaBridge {
  reportError(report: RendererErrorReport): void;
  /** Overlay only: let clicks reach Mocha (true) or fall through (false). */
  setOverlayInteractive(interactive: boolean): void;
  /** Overlay only: the user started or stopped dragging Mocha. */
  dragOverlay(phase: 'start' | 'end'): void;
  /** Overlay only: cursor position relative to the window. Returns an unsubscribe function. */
  onCursorMove(callback: (point: { x: number; y: number }) => void): () => void;
  /** Overlay only: pause state changes. Returns an unsubscribe function. */
  onPausedChange(callback: (paused: boolean) => void): () => void;
  /** Overlay only: the user switched Spaces. Returns an unsubscribe function. */
  onSpaceChanged(callback: () => void): () => void;
  /** Overlay only: the user went away or came back. Returns an unsubscribe function. */
  onAwayChange(callback: (away: boolean) => void): () => void;
  /** Overlay only: Mocha became tired or rested. Returns an unsubscribe function. */
  onTiredChange(callback: (tired: boolean) => void): () => void;
  /** Overlay only: open Mocha's Tower. */
  openTower(): void;
  /** Overlay only: the user petted Mocha, which lifts its mood. */
  petted(): void;
}

/** The API the reminder's own preload exposes as `window.reminder`. Nothing else. */
export interface ReminderBridge {
  /** What to show; sent again when the bubble moves. Returns an unsubscribe function. */
  onShow(callback: (show: ReminderShow) => void): () => void;
  /** The user's answer. */
  choose(choice: ReminderChoice): void;
}

/** The API the settings window's own preload exposes as `window.settings`. Nothing else. */
export interface SettingsBridge {
  load(): Promise<Preferences>;
  /** Resolves to false if the main process rejected the values. */
  save(preferences: Preferences): Promise<boolean>;
}

/** The API the Tower window's own preload exposes as `window.tower`. Nothing else. */
export interface TowerBridge {
  /** Mocha's needs, now and whenever they change. Returns an unsubscribe function. */
  onNeeds(callback: (view: TowerView) => void): () => void;
  /** Care for Mocha. */
  act(action: TowerAction): void;
}
