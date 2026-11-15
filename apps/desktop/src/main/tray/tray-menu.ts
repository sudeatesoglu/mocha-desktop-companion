import { type DailyStats, formatDuration } from '@mocha/core';
import type { MenuItemConstructorOptions } from 'electron';
import { FOCUS_MINUTES, type FocusMinutes } from '../../shared/tower.ts';

export interface TrayActions {
  openTower(): void;
  startFocus(minutes: FocusMinutes): void;
  endFocus(): void;
  endBreak(): void;
  togglePause(): void;
  openSettings(): void;
  resetPosition(): void;
  quit(): void;
}

/**
 * The tray menu as plain data. Building it from state in a pure function
 * keeps the labels and wiring testable; Electron only turns it into a menu.
 */
export function trayMenuTemplate(
  state: {
    paused: boolean;
    today?: DailyStats | undefined;
    /** Time left in the running break, if any. */
    breakLeftMs?: number | undefined;
    /** Time left in the running focus session, if any. */
    focusLeftMs?: number | undefined;
  },
  actions: TrayActions,
): MenuItemConstructorOptions[] {
  return [
    ...todayItems(state.today),
    { label: 'Open Tower', click: () => actions.openTower() },
    ...breakItems(state.breakLeftMs, actions),
    ...focusItems(state, actions),
    {
      label: state.paused ? 'Resume Mocha' : 'Pause Mocha',
      click: () => actions.togglePause(),
    },
    { label: 'Reset Position', click: () => actions.resetPosition() },
    { type: 'separator' },
    {
      label: 'Settings…',
      accelerator: 'CommandOrControl+,',
      click: () => actions.openSettings(),
    },
    // The system About panel, filled from app.setAboutPanelOptions().
    { role: 'about', label: 'About Mocha' },
    { type: 'separator' },
    { label: 'Quit Mocha', accelerator: 'CommandOrControl+Q', click: () => actions.quit() },
  ];
}

/** Today's numbers as read-only lines, or nothing when there is no history. */
function todayItems(today: DailyStats | undefined): MenuItemConstructorOptions[] {
  if (!today) return [];
  return [
    { label: `Active today: ${formatDuration(today.activeMs)}`, enabled: false },
    { label: `Breaks today: ${today.breaks}`, enabled: false },
    { label: `Longest stretch: ${formatDuration(today.longestStretchMs)}`, enabled: false },
    { type: 'separator' },
  ];
}

/**
 * The time left in a running break and a way to end it early. A break goes
 * on past its length while the user is away, so it may have no time left.
 */
function breakItems(
  breakLeftMs: number | undefined,
  actions: TrayActions,
): MenuItemConstructorOptions[] {
  if (breakLeftMs === undefined) return [];
  return [
    {
      label: breakLeftMs > 0 ? `On a break: ${formatDuration(breakLeftMs)} left` : 'On a break',
      enabled: false,
    },
    { label: 'End Break', click: () => actions.endBreak() },
  ];
}

/**
 * Starting a focus session, or the time left in the running one and a way
 * to end it. A paused Mocha starts no session: the break rules are paused.
 */
function focusItems(
  state: { paused: boolean; focusLeftMs?: number | undefined },
  actions: TrayActions,
): MenuItemConstructorOptions[] {
  if (state.focusLeftMs !== undefined) {
    return [
      { label: `Focusing: ${formatDuration(state.focusLeftMs)} left`, enabled: false },
      { label: 'End Focus Session', click: () => actions.endFocus() },
    ];
  }
  return [
    {
      label: 'Focus with Mocha',
      enabled: !state.paused,
      submenu: FOCUS_MINUTES.map((minutes) => ({
        label: `${minutes} minutes`,
        click: () => actions.startFocus(minutes),
      })),
    },
  ];
}
