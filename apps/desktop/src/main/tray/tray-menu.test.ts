import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { trayMenuTemplate } from './tray-menu.ts';

const actions = () => ({
  openTower: vi.fn(),
  startFocus: vi.fn(),
  endFocus: vi.fn(),
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
  it('lists the Tower, focus, pause, reset, settings, about and quit, in that order', () => {
    const labels = trayMenuTemplate({ paused: false }, actions()).map(
      (entry) => entry.label ?? `(${entry.type})`,
    );

    expect(labels).toEqual([
      'Open Tower',
      'Focus with Mocha',
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

    expect(item(menu, 'Resume Mocha')).toBeDefined();
  });

  it('wires each item to its action', () => {
    const wired = actions();
    const menu = trayMenuTemplate({ paused: false }, wired);

    click(item(menu, 'Open Tower'));
    click(item(menu, 'Pause Mocha'));
    click(item(menu, 'Reset Position'));
    click(item(menu, 'Settings…'));
    click(item(menu, 'Quit Mocha'));

    expect(wired.openTower).toHaveBeenCalledOnce();
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

  it('starts with today’s numbers as read-only lines when there is a history', () => {
    const menu = trayMenuTemplate(
      {
        paused: false,
        today: { activeMs: 135 * 60_000, breaks: 3, longestStretchMs: 52 * 60_000 },
      },
      actions(),
    );

    expect(menu.slice(0, 4)).toEqual([
      { label: 'Active today: 2h 15m', enabled: false },
      { label: 'Breaks today: 3', enabled: false },
      { label: 'Longest stretch: 52m', enabled: false },
      { type: 'separator' },
    ]);
    expect(menu[4]?.label).toBe('Open Tower');
  });

  it('offers focus sessions of 25, 40 and 50 minutes', () => {
    const wired = actions();
    const focus = item(trayMenuTemplate({ paused: false }, wired), 'Focus with Mocha');
    const lengths = focus.submenu as MenuItemConstructorOptions[];

    expect(lengths.map(({ label }) => label)).toEqual(['25 minutes', '40 minutes', '50 minutes']);
    click(lengths[1] as MenuItemConstructorOptions);
    expect(wired.startFocus).toHaveBeenCalledWith(40);
  });

  it('offers no focus session while paused', () => {
    expect(item(trayMenuTemplate({ paused: true }, actions()), 'Focus with Mocha').enabled).toBe(
      false,
    );
  });

  it('shows the time left in a session and a way to end it', () => {
    const wired = actions();
    const menu = trayMenuTemplate({ paused: false, focusLeftMs: 18 * 60_000 + 30_000 }, wired);

    expect(item(menu, 'Focusing: 18m left').enabled).toBe(false);
    click(item(menu, 'End Focus Session'));
    expect(wired.endFocus).toHaveBeenCalledOnce();
    expect(menu.some(({ label }) => label === 'Focus with Mocha')).toBe(false);
  });
});
