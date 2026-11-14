import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REMINDER_HEIGHT, REMINDER_WIDTH } from '../../shared/reminder.ts';
import { createReminderWindow } from './create-reminder-window.ts';

const fakeWindow = vi.hoisted(() => ({
  setAlwaysOnTop: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
}));
const factory = vi.hoisted(() => ({ createSecureWindow: vi.fn(() => fakeWindow) }));
vi.mock('./create-secure-window.ts', () => factory);

const PRELOAD = '/app/out/preload/reminder.cjs';

describe('createReminderWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a transparent bubble that never takes keyboard focus', () => {
    createReminderWindow(PRELOAD, { x: 10, y: 20 }, 'darwin');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 10,
        y: 20,
        width: REMINDER_WIDTH,
        height: REMINDER_HEIGHT,
        transparent: true,
        frame: false,
        focusable: false,
        acceptFirstMouse: true,
        type: 'panel',
      }),
      PRELOAD,
      { activate: false },
    );
  });

  it('floats next to Mocha on every Space', () => {
    createReminderWindow(PRELOAD, { x: 0, y: 0 }, 'darwin');

    expect(fakeWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating');
    expect(fakeWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true,
    });
  });

  it('uses the macOS-only panel type on macOS only', () => {
    createReminderWindow(PRELOAD, { x: 0, y: 0 }, 'win32');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.not.objectContaining({ type: 'panel' }),
      PRELOAD,
      { activate: false },
    );
  });
});
