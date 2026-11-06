// Guards the bundled default skin: it must always pass both validation
// stages, or Mocha would fall back to the blocky placeholder. Lives with the
// main-process tests because it reads files with Node APIs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANIMATION_NAMES, checkSkinImage, parseSkinManifest } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { SPRITE_SIZE } from '../shared/overlay.ts';

const SKIN_DIR = join(import.meta.dirname, '../renderer/skins/default');

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string) {
  const png = readFileSync(file);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe('default skin', () => {
  const parsed = parseSkinManifest(
    JSON.parse(readFileSync(join(SKIN_DIR, 'manifest.json'), 'utf8')),
  );

  it('has a valid manifest', () => {
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
  });

  it('matches its sprite sheet', () => {
    if (!parsed.ok) throw new Error('manifest is invalid');
    const size = pngSize(join(SKIN_DIR, parsed.value.image));

    expect(checkSkinImage(parsed.value, size)).toEqual([]);
  });

  it('uses the overlay frame size', () => {
    if (!parsed.ok) throw new Error('manifest is invalid');

    expect(parsed.value.frameSize).toEqual({ width: SPRITE_SIZE, height: SPRITE_SIZE });
  });

  it('provides every animation, so no state falls back to idle', () => {
    if (!parsed.ok) throw new Error('manifest is invalid');

    expect(Object.keys(parsed.value.animations).sort()).toEqual([...ANIMATION_NAMES].sort());
  });

  it('gives every frame feet, so the shadow and dust always have an anchor', () => {
    if (!parsed.ok) throw new Error('manifest is invalid');
    const frames = Object.values(parsed.value.animations).flatMap(
      (animation) => animation?.frames ?? [],
    );

    expect(frames.every((frame) => frame.anchors?.feet !== undefined)).toBe(true);
  });
});
