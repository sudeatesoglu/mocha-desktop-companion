import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadImage } from './load-image.ts';

describe('loadImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves with the decoded image', async () => {
    class FakeImage {
      src = '';
      decode = vi.fn(async () => {});
    }
    vi.stubGlobal('Image', FakeImage);

    const image = await loadImage('sprite.png');

    expect(image.src).toBe('sprite.png');
  });

  it('rejects when the image cannot be decoded', async () => {
    class BrokenImage {
      src = '';
      decode = () => Promise.reject(new Error('EncodingError'));
    }
    vi.stubGlobal('Image', BrokenImage);

    await expect(loadImage('missing.png')).rejects.toThrow('EncodingError');
  });
});
