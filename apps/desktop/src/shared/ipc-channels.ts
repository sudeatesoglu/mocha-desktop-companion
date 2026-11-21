import type {
  AccessorySlot,
  BrowserCapability,
  BrowsingPose,
  DecorSlot,
  ItemId,
  Look,
  RitualId,
  RitualPose,
} from '@mocha/core';
import type { BrowserView } from './browser.ts';
import type { LoginItem } from './login-item.ts';
import type { Preferences } from './preferences.ts';
import type { ReminderChoice, ReminderShow } from './reminder.ts';
import type { RitualShow } from './ritual.ts';
import type { SoundKind } from './sounds.ts';
import type { FocusMinutes, TowerAction, TowerView } from './tower.ts';

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
  /** Main → overlay: a break started (true) or ended (false); Mocha naps through it. */
  OverlayResting: 'overlay:resting',
  /** Overlay → main (send): the page listens now; send it the current state. */
  OverlayReady: 'overlay:ready',
  /** Overlay → main (send): Mocha was double-clicked; open its Tower. */
  OpenTower: 'overlay:open-tower',
  /** Main → overlay: the pose of the ritual done together, or null when none runs. */
  OverlayRitual: 'overlay:ritual',
  /** Main → overlay: a focus session started (true) or ended (false): Mocha reads along. */
  OverlayFocusing: 'overlay:focusing',
  /** Main → overlay: Mocha's energy fell below (true) or rose above (false) the tired line. */
  OverlayTired: 'overlay:tired',
  /** Main → overlay: the pose for what the user does in the browser, or null for none. */
  OverlayBrowsing: 'overlay:browsing',
  /** Main → overlay (no data): Mocha found something during the break that just ended. */
  OverlayFound: 'overlay:found',
  /** Main → overlay: what Mocha wears, when the page loads and when it changes. */
  OverlayLook: 'overlay:look',
  /** Main → overlay: whether sounds are on, when the page loads and when it changes. */
  OverlaySounds: 'overlay:sounds',
  /** Main → overlay: a moment that has a sound; played only while sounds are on. */
  OverlaySound: 'overlay:sound',
  /** Overlay → main (send): the user petted Mocha on the desktop. */
  OverlayPetted: 'overlay:petted',
  /** Main → tower: Mocha's needs, sent when the page loads and when they change. */
  TowerNeeds: 'tower:needs',
  /** Tower → main (send): the page listens now; send it the needs. */
  TowerReady: 'tower:ready',
  /** Tower → main (send): start a focus session of 25, 40 or 50 minutes, or end it (null). */
  TowerFocus: 'tower:focus',
  /** Tower → main (send): put a found accessory on in its slot, or take it off (null). */
  TowerWear: 'tower:wear',
  /** Tower → main (send): put a found decor item in its slot of the room, or clear it (null). */
  TowerPlace: 'tower:place',
  /** Tower → main (send): pet, treat or rest together. */
  TowerAct: 'tower:act',
  /** Main → reminder: what to show (work and break durations). */
  ReminderShow: 'reminder:show',
  /** Reminder → main (send): the user's answer: accept, snooze or dismiss. */
  ReminderChoose: 'reminder:choose',
  /** Ritual → main (send): the page listens now; send it where it sits. */
  RitualReady: 'ritual:ready',
  /** Main → ritual: which side of Mocha the bubble sits on. */
  RitualShow: 'ritual:show',
  /** Ritual → main (send): the user started a ritual. */
  RitualStart: 'ritual:start',
  /** Ritual → main (send): the ritual ran to its end. */
  RitualFinish: 'ritual:finish',
  /** Ritual → main (send): close the bubble ("Just rest", "Stop" or done). */
  RitualClose: 'ritual:close',
  /** Settings → main (invoke): the current preferences. */
  SettingsLoad: 'settings:load',
  /** Settings → main (invoke): save and apply preferences; resolves to whether they were saved. */
  SettingsSave: 'settings:save',
  /** Settings → main (invoke, no data): whether Mocha opens at login. */
  SettingsLoginItem: 'settings:login-item',
  /** Settings → main (invoke): open Mocha at login or not; resolves to the new state. */
  SettingsOpenAtLogin: 'settings:open-at-login',
  /** Settings → main (invoke, no data): whether sounds are on. */
  SettingsSounds: 'settings:sounds',
  /** Settings → main (invoke): turn sounds on or off; resolves to the new state. */
  SettingsSetSounds: 'settings:set-sounds',
  /** Settings → main (invoke, no data): the browser companion's state. */
  SettingsBrowser: 'settings:browser',
  /** Settings → main (invoke): let the extension connect or not; resolves to the new state. */
  SettingsAllowBrowser: 'settings:allow-browser',
  /** Settings → main (invoke, no data): a new pairing code; the old one stops working. */
  SettingsNewPairingCode: 'settings:new-pairing-code',
  /** Settings → main (invoke, no data): put the pairing code on the clipboard. */
  SettingsCopyPairingCode: 'settings:copy-pairing-code',
  /** Settings → main (invoke): turn one capability on or off; resolves to the new state. */
  SettingsSetCapability: 'settings:set-capability',
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
  /** Overlay only: a break started or ended. Returns an unsubscribe function. */
  onRestingChange(callback: (resting: boolean) => void): () => void;
  /** Overlay only: the page listens now and wants the current state. */
  ready(): void;
  /** Overlay only: a ritual started (its pose) or ended (null). Returns an unsubscribe function. */
  onRitualChange(callback: (pose: RitualPose | null) => void): () => void;
  /** Overlay only: a focus session started or ended. Returns an unsubscribe function. */
  onFocusingChange(callback: (focusing: boolean) => void): () => void;
  /** Overlay only: Mocha became tired or rested. Returns an unsubscribe function. */
  onTiredChange(callback: (tired: boolean) => void): () => void;
  /** Overlay only: the user does something else in the browser. Returns an unsubscribe function. */
  onBrowsingChange(callback: (pose: BrowsingPose | null) => void): () => void;
  /** Overlay only: Mocha found something. Returns an unsubscribe function. */
  onFound(callback: () => void): () => void;
  /** Overlay only: what Mocha wears. Returns an unsubscribe function. */
  onLookChange(callback: (look: Look) => void): () => void;
  /** Overlay only: sounds were turned on or off. Returns an unsubscribe function. */
  onSoundsChange(callback: (enabled: boolean) => void): () => void;
  /** Overlay only: a moment with a sound. Returns an unsubscribe function. */
  onSound(callback: (kind: SoundKind) => void): () => void;
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
  /** Whether Mocha opens at login, read from the system. */
  loginItem(): Promise<LoginItem>;
  /** Asks the system to open Mocha at login or not; resolves to the new state. */
  setOpenAtLogin(open: boolean): Promise<LoginItem>;
  /** Whether Mocha makes sounds. */
  sounds(): Promise<boolean>;
  /** Turns sounds on or off; resolves to the new state. */
  setSounds(enabled: boolean): Promise<boolean>;
  /** The browser companion: allowed, pairing code and capabilities. */
  browser(): Promise<BrowserView>;
  allowBrowser(allowed: boolean): Promise<BrowserView>;
  newPairingCode(): Promise<BrowserView>;
  /** Resolves to false when there is no code to copy. */
  copyPairingCode(): Promise<boolean>;
  setCapability(name: BrowserCapability, enabled: boolean): Promise<BrowserView>;
}

/** The API the Tower window's own preload exposes as `window.tower`. Nothing else. */
export interface TowerBridge {
  /** Mocha's needs, now and whenever they change. Returns an unsubscribe function. */
  onNeeds(callback: (view: TowerView) => void): () => void;
  /** The page listens now and wants the needs. */
  ready(): void;
  /** Care for Mocha. */
  act(action: TowerAction): void;
  /** Starts a focus session of `minutes`, or ends the running one (null). */
  focus(minutes: FocusMinutes | null): void;
  /** Puts a found accessory on in `slot`, or takes the slot's off (null). */
  wear(slot: AccessorySlot, id: ItemId | null): void;
  /** Puts a found decor item in `slot` of the room, or clears the slot (null). */
  place(slot: DecorSlot, id: ItemId | null): void;
}

/** The API the ritual bubble's own preload exposes as `window.ritual`. Nothing else. */
export interface RitualBridge {
  /** The page listens now and wants to know where it sits. */
  ready(): void;
  /** Where the bubble sits; sent again when it moves. Returns an unsubscribe function. */
  onShow(callback: (show: RitualShow) => void): () => void;
  start(ritual: RitualId): void;
  finish(): void;
  close(): void;
}
