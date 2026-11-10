import { describe, expect, it, vi } from 'vitest';
import { createSettingsWindow, SETTINGS_HEIGHT, SETTINGS_WIDTH } from './create-settings-window.ts';

const factory = vi.hoisted(() => ({ createSecureWindow: vi.fn(() => ({})) }));
vi.mock('./create-secure-window.ts', () => factory);

describe('createSettingsWindow', () => {
  it('creates a small, fixed-size window that takes focus like any other', () => {
    createSettingsWindow('/app/out/preload/settings.cjs');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        width: SETTINGS_WIDTH,
        height: SETTINGS_HEIGHT,
        resizable: false,
        title: 'Mocha Settings',
      }),
      '/app/out/preload/settings.cjs',
    );
  });
});
