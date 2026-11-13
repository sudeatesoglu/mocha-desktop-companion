import { describe, expect, it, vi } from 'vitest';
import { createTowerWindow, TOWER_HEIGHT, TOWER_WIDTH } from './create-tower-window.ts';

const factory = vi.hoisted(() => ({ createSecureWindow: vi.fn(() => ({})) }));
vi.mock('./create-secure-window.ts', () => factory);

describe('createTowerWindow', () => {
  it('creates a fixed-size window that takes focus like any other', () => {
    createTowerWindow('/app/out/preload/tower.cjs');

    expect(factory.createSecureWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        width: TOWER_WIDTH,
        height: TOWER_HEIGHT,
        resizable: false,
        title: 'Mocha’s Tower',
      }),
      '/app/out/preload/tower.cjs',
    );
  });
});
