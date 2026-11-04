import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createOverlayWindow } from './create-overlay-window.ts';

const fakeWindow = vi.hoisted(() => ({
  setAlwaysOnTop: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
  setIgnoreMouseEvents: vi.fn(),
}));

const factory = vi.hoisted(() => ({ createSecureWindow: vi.fn(() => fakeWindow) }));
vi.mock('./create-secure-window.ts', () => factory);

const PRELOAD = '/app/out/preload/index.cjs';
const POSITION = { x: 1272, y: 732 };

describe('createOverlayWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a transparent overlay at the given position without taking focus', () => {
    createOverlayWindow(PRELOAD, POSITION, 'darwin');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 1272,
        y: 732,
        transparent: true,
        type: 'panel',
      }),
      PRELOAD,
      { activate: false },
    );
  });

  it('floats above other windows on every Space, including fullscreen ones', () => {
    createOverlayWindow(PRELOAD, POSITION, 'darwin');

    expect(fakeWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating');
    expect(fakeWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true,
    });
  });

  it('starts click-through while still forwarding mouse moves', () => {
    createOverlayWindow(PRELOAD, POSITION, 'darwin');

    expect(fakeWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });
  });

  it('passes the platform on to the window options', () => {
    createOverlayWindow(PRELOAD, POSITION, 'linux');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.not.objectContaining({ type: 'panel' }),
      PRELOAD,
      { activate: false },
    );
  });
});
