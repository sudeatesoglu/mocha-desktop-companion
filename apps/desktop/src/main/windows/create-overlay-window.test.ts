import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OVERLAY_SIZE } from '../../shared/overlay.ts';
import { createOverlayWindow } from './create-overlay-window.ts';

const fakeWindow = vi.hoisted(() => ({
  setAlwaysOnTop: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
  setIgnoreMouseEvents: vi.fn(),
}));

const factory = vi.hoisted(() => ({ createSecureWindow: vi.fn(() => fakeWindow) }));
vi.mock('./create-secure-window.ts', () => factory);

const PRELOAD = '/app/out/preload/index.cjs';
const WORK_AREA = { x: 0, y: 25, width: 1440, height: 875 };

describe('createOverlayWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a transparent overlay in the bottom-right corner without taking focus', () => {
    createOverlayWindow(PRELOAD, WORK_AREA, 'darwin');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 1440 - OVERLAY_SIZE - 24,
        y: 25 + 875 - OVERLAY_SIZE - 24,
        transparent: true,
        type: 'panel',
      }),
      PRELOAD,
      { activate: false },
    );
  });

  it('floats above other windows on every Space, including fullscreen ones', () => {
    createOverlayWindow(PRELOAD, WORK_AREA, 'darwin');

    expect(fakeWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating');
    expect(fakeWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true,
    });
  });

  it('starts click-through while still forwarding mouse moves', () => {
    createOverlayWindow(PRELOAD, WORK_AREA, 'darwin');

    expect(fakeWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
  });

  it('passes the platform on to the window options', () => {
    createOverlayWindow(PRELOAD, WORK_AREA, 'linux');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.not.objectContaining({ type: 'panel' }),
      PRELOAD,
      { activate: false },
    );
  });
});
