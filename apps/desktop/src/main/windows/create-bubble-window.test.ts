import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBubbleWindow } from './create-bubble-window.ts';

const fakeWindow = vi.hoisted(() => ({
  setAlwaysOnTop: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
}));
const factory = vi.hoisted(() => ({ createSecureWindow: vi.fn(() => fakeWindow) }));
vi.mock('./create-secure-window.ts', () => factory);

const PRELOAD = '/app/out/preload/reminder.cjs';
const BUBBLE = { width: 264, height: 112, title: 'Mocha: break reminder' };

describe('createBubbleWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a transparent bubble that never takes keyboard focus', () => {
    createBubbleWindow(PRELOAD, { x: 10, y: 20 }, BUBBLE, 'darwin');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 10,
        y: 20,
        width: 264,
        height: 112,
        title: 'Mocha: break reminder',
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
    createBubbleWindow(PRELOAD, { x: 0, y: 0 }, BUBBLE, 'darwin');

    expect(fakeWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating');
    expect(fakeWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true,
    });
  });

  it('uses the macOS-only panel type on macOS only', () => {
    createBubbleWindow(PRELOAD, { x: 0, y: 0 }, BUBBLE, 'win32');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.not.objectContaining({ type: 'panel' }),
      PRELOAD,
      { activate: false },
    );
  });
});
