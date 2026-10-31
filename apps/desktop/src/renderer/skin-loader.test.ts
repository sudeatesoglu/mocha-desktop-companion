import { describe, expect, it, vi } from 'vitest';
import { loadSkin } from './skin-loader.ts';

const MANIFEST = {
  schemaVersion: 1,
  name: 'Test',
  image: 'sprite.png',
  frameSize: { width: 48, height: 48 },
  animations: { idle: { loop: true, frames: [{ index: 1, durationMs: 500 }] } },
};

const image = (width: number, height = 48) => ({ width, height });

describe('loadSkin', () => {
  it('loads a skin whose manifest and image match', async () => {
    const loadImage = vi.fn(async () => image(96));

    const result = await loadSkin(MANIFEST, loadImage);

    expect(result).toEqual({ ok: true, skin: { manifest: MANIFEST, image: image(96) } });
    expect(loadImage).toHaveBeenCalledWith('sprite.png');
  });

  it('rejects an invalid manifest without loading any file', async () => {
    const loadImage = vi.fn(async () => image(96));

    const result = await loadSkin({ ...MANIFEST, image: '../x.png' }, loadImage);

    expect(result.ok).toBe(false);
    expect(loadImage).not.toHaveBeenCalled();
  });

  it('reports an image that fails to load', async () => {
    const result = await loadSkin(MANIFEST, async () => {
      throw new Error('404');
    });

    expect(result).toEqual({ ok: false, errors: ['image: could not load "sprite.png" (404)'] });
  });

  it('reports a non-Error rejection too', async () => {
    const result = await loadSkin(MANIFEST, () => Promise.reject('offline'));

    expect(result).toEqual({ ok: false, errors: ['image: could not load "sprite.png" (offline)'] });
  });

  it('rejects frames of a different size than required, before loading the image', async () => {
    const loadImage = vi.fn(async () => image(64, 64));
    const manifest = { ...MANIFEST, frameSize: { width: 32, height: 32 } };

    const result = await loadSkin(manifest, loadImage, { width: 48, height: 48 });

    expect(result).toEqual({ ok: false, errors: ['frameSize: must be 48x48, got 32x32'] });
    expect(loadImage).not.toHaveBeenCalled();
  });

  it('accepts frames of exactly the required size', async () => {
    const result = await loadSkin(MANIFEST, async () => image(96), { width: 48, height: 48 });

    expect(result.ok).toBe(true);
  });

  it('rejects an image that does not contain the referenced frames', async () => {
    const result = await loadSkin(MANIFEST, async () => image(48)); // frame 1 is missing

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('animations.idle.frames.0.index');
  });
});
