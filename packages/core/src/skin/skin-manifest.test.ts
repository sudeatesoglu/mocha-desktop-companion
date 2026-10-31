import { describe, expect, it } from 'vitest';
import { checkSkinImage, frameSource, parseSkinManifest } from './skin-manifest.ts';

/** A minimal valid manifest; tests override one field at a time. */
function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    name: 'Test skin',
    image: 'sprite.png',
    frameSize: { width: 48, height: 48 },
    animations: {
      idle: {
        loop: true,
        frames: [
          { index: 0, durationMs: 800, anchors: { eye: { x: 18, y: 18 } } },
          { index: 1, durationMs: 800 },
        ],
      },
    },
    ...overrides,
  };
}

const errorsOf = (input: unknown): string[] => {
  const result = parseSkinManifest(input);
  return result.ok ? [] : result.errors;
};

describe('parseSkinManifest', () => {
  it('accepts a valid manifest', () => {
    const result = parseSkinManifest(manifest());

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.animations.idle.frames).toHaveLength(2);
  });

  it('accepts every optional animation and anchor', () => {
    const frame = {
      index: 0,
      durationMs: 100,
      anchors: { eye: { x: 1, y: 1 }, beak: { x: 2, y: 2 }, head: { x: 3, y: 3 } },
    };
    const animations = Object.fromEntries(
      ['idle', 'blink', 'look', 'hop', 'sleep'].map((name) => [
        name,
        { loop: false, frames: [frame] },
      ]),
    );

    expect(parseSkinManifest(manifest({ animations, author: 'Soda' })).ok).toBe(true);
  });

  it('requires an idle animation, which every other state falls back to', () => {
    expect(errorsOf(manifest({ animations: {} })).join()).toContain('animations.idle');
  });

  it.each([
    ['an unknown schema version', { schemaVersion: 2 }, 'schemaVersion'],
    ['an empty name', { name: '' }, 'name'],
    ['a frame size of zero', { frameSize: { width: 0, height: 48 } }, 'frameSize.width'],
    ['a fractional frame size', { frameSize: { width: 47.5, height: 48 } }, 'frameSize.width'],
    ['an unknown top-level field', { script: 'alert(1)' }, 'script'],
    [
      'an unknown animation',
      { animations: { idle: { loop: true, frames: [{ index: 0, durationMs: 100 }] }, dance: {} } },
      'dance',
    ],
  ])('rejects %s', (_case, overrides, path) => {
    expect(errorsOf(manifest(overrides)).join()).toContain(path);
  });

  it.each([
    ['a path into another folder', '../secrets.png'],
    ['an absolute path', '/etc/passwd.png'],
    ['a URL', 'https://example.com/sprite.png'],
    ['a non-PNG file', 'sprite.svg'],
  ])('rejects %s as image name', (_case, image) => {
    expect(errorsOf(manifest({ image })).join()).toContain('image');
  });

  it.each([
    ['an empty frame list', { loop: true, frames: [] }, 'frames'],
    ['a negative frame index', { loop: true, frames: [{ index: -1, durationMs: 100 }] }, 'index'],
    [
      'a frame shorter than one display frame',
      { loop: true, frames: [{ index: 0, durationMs: 5 }] },
      'durationMs',
    ],
    ['a missing loop flag', { frames: [{ index: 0, durationMs: 100 }] }, 'loop'],
  ])('rejects %s', (_case, idle, path) => {
    expect(errorsOf(manifest({ animations: { idle } })).join()).toContain(path);
  });

  it('rejects an anchor outside the frame', () => {
    const idle = {
      loop: true,
      frames: [{ index: 0, durationMs: 100, anchors: { eye: { x: 48, y: 10 } } }],
    };

    expect(errorsOf(manifest({ animations: { idle } })).join()).toContain(
      'animations.idle.frames.0.anchors.eye',
    );
  });

  it('reports every problem at once, each with its path', () => {
    const errors = errorsOf(manifest({ name: '', image: 'x.gif' }));

    expect(errors).toHaveLength(2);
    expect(errors.every((error) => /^\w[\w.]*: /.test(error))).toBe(true);
  });

  it.each([null, 'manifest', 42, []])('rejects %j as a manifest', (input) => {
    expect(parseSkinManifest(input).ok).toBe(false);
  });
});

describe('checkSkinImage', () => {
  const parsed = (() => {
    const result = parseSkinManifest(manifest());
    if (!result.ok) throw new Error('fixture must be valid');
    return result.value;
  })();

  it('accepts an image that holds every referenced frame', () => {
    expect(checkSkinImage(parsed, { width: 96, height: 48 })).toEqual([]);
  });

  it('rejects an image that is not a whole number of frames', () => {
    expect(checkSkinImage(parsed, { width: 100, height: 48 }).join()).toContain('multiple');
  });

  it('rejects a frame index beyond the sheet', () => {
    const errors = checkSkinImage(parsed, { width: 48, height: 48 }); // one cell only

    expect(errors).toEqual([
      'animations.idle.frames.1.index: frame 1 is outside the 1-frame sheet',
    ]);
  });
});

describe('frameSource', () => {
  const size = { width: 48, height: 48 };

  it('finds frames row by row in the sheet', () => {
    expect(frameSource(size, 0, 144)).toEqual({ x: 0, y: 0, width: 48, height: 48 });
    expect(frameSource(size, 2, 144)).toEqual({ x: 96, y: 0, width: 48, height: 48 });
    expect(frameSource(size, 3, 144)).toEqual({ x: 0, y: 48, width: 48, height: 48 });
  });
});
