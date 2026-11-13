import { describe, expect, it, vi } from 'vitest';
import { loadBundledFile, loadDefaultLook } from './default-skin.ts';
import { PLACEHOLDER_ANIMATIONS } from './placeholder-sprite.ts';

/** The sprite sheet's real size: 15 frames of 48x48. */
const sheet = { width: 720, height: 48 };

describe('loadBundledFile', () => {
  it('loads a file the skin lists, by its bundled URL', async () => {
    const load = vi.fn(async (url: string) => url);

    await expect(
      loadBundledFile('sprite.png', load, { 'sprite.png': '/assets/s.png' }),
    ).resolves.toBe('/assets/s.png');
  });

  it('refuses any other file name', async () => {
    const load = vi.fn();

    await expect(loadBundledFile('../../secret.png', load)).rejects.toThrow('not part of the skin');
    expect(load).not.toHaveBeenCalled();
  });
});

describe('loadDefaultLook', () => {
  it('uses the bundled skin when it loads', async () => {
    const report = vi.fn();

    const look = await loadDefaultLook(async () => sheet, report);

    expect(look.animations.idle.frames.length).toBeGreaterThan(0);
    expect(look.animations).not.toBe(PLACEHOLDER_ANIMATIONS);
    expect(report).not.toHaveBeenCalled();
  });

  it('falls back to the placeholder and reports why when the image fails', async () => {
    const report = vi.fn();

    const look = await loadDefaultLook(() => Promise.reject(new Error('offline')), report);

    expect(look.animations).toBe(PLACEHOLDER_ANIMATIONS);
    expect(report).toHaveBeenCalledWith(expect.stringContaining('using the placeholder'));
  });
});
