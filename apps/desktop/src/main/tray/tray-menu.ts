import { type DailyStats, formatDuration } from '@mocha/core';
import type { MenuItemConstructorOptions } from 'electron';

export interface TrayActions {
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
  state: { paused: boolean; today?: DailyStats | undefined },
  actions: TrayActions,
): MenuItemConstructorOptions[] {
  return [
    ...todayItems(state.today),
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
