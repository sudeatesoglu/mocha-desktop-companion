import type { MenuItemConstructorOptions } from 'electron';

export interface TrayActions {
  togglePause(): void;
  resetPosition(): void;
  quit(): void;
}

/**
 * The tray menu as plain data. Building it from state in a pure function
 * keeps the labels and wiring testable; Electron only turns it into a menu.
 */
export function trayMenuTemplate(
  state: { paused: boolean },
  actions: TrayActions,
): MenuItemConstructorOptions[] {
  return [
    {
      label: state.paused ? 'Resume Mocha' : 'Pause Mocha',
      click: () => actions.togglePause(),
    },
    { label: 'Reset Position', click: () => actions.resetPosition() },
    { type: 'separator' },
    // The system About panel, filled from app.setAboutPanelOptions().
    { role: 'about', label: 'About Mocha' },
    { type: 'separator' },
    { label: 'Quit Mocha', accelerator: 'CommandOrControl+Q', click: () => actions.quit() },
  ];
}
