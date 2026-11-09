import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { trayMenuTemplate } from './tray-menu.ts';

const actions = () => ({
  togglePause: vi.fn(),
  openSettings: vi.fn(),
  resetPosition: vi.fn(),
  quit: vi.fn(),
});

const item = (menu: MenuItemConstructorOptions[], label: string) => {
  const found = menu.find((entry) => entry.label === label);
  if (!found) throw new Error(`no menu item "${label}"`);
  return found;
};

/** Electron passes (menuItem, window, event); the actions ignore them. */
const click = (entry: MenuItemConstructorOptions) => (entry.click as (() => void) | undefined)?.();

describe('trayMenuTemplate', () => {
  it('lists pause, reset, settings, about and quit, in that order', () => {
    const labels = trayMenuTemplate({ paused: false }, actions()).map(
      (entry) => entry.label ?? `(${entry.type})`,
    );

    expect(labels).toEqual([
      'Pause Mocha',
      'Reset Position',
      '(separator)',
      'Settings…',
      'About Mocha',
      '(separator)',
      'Quit Mocha',
    ]);
  });

  it('offers to resume while paused', () => {
    const menu = trayMenuTemplate({ paused: true }, actions());

    expect(menu[0]?.label).toBe('Resume Mocha');
  });

  it('wires each item to its action', () => {
    const wired = actions();
    const menu = trayMenuTemplate({ paused: false }, wired);

    click(item(menu, 'Pause Mocha'));
    click(item(menu, 'Reset Position'));
    click(item(menu, 'Settings…'));
    click(item(menu, 'Quit Mocha'));

    expect(wired.togglePause).toHaveBeenCalledOnce();
    expect(wired.resetPosition).toHaveBeenCalledOnce();
    expect(wired.openSettings).toHaveBeenCalledOnce();
    expect(wired.quit).toHaveBeenCalledOnce();
  });

  it('uses the standard About panel and the usual quit shortcut', () => {
    const menu = trayMenuTemplate({ paused: false }, actions());

    expect(item(menu, 'About Mocha').role).toBe('about');
    expect(item(menu, 'Quit Mocha').accelerator).toBe('CommandOrControl+Q');
  });
});
