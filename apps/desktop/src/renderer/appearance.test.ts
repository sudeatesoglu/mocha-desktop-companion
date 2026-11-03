import type { SkinManifest } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { placeholderAppearance, type SpritePainter, skinAppearance } from './appearance.ts';
import { PLACEHOLDER_ANIMATIONS, PLACEHOLDER_BLOCKS } from './placeholder-sprite.ts';
import { PUPIL_COLOR, PUPIL_HOVER_COLOR } from './pupil.ts';
import { SHADOW_COLOR } from './shadow.ts';

interface FakeImage {
  width: number;
  height: number;
}

/** Records drawImage source rectangles and fillRect calls. */
function recordingPainter() {
  const sources: string[] = [];
  const fills: string[] = [];
  const painter: SpritePainter<FakeImage> = {
    fillStyle: '',
    fillRect(x, y, w, h) {
      fills.push(`${String(this.fillStyle)} ${x},${y} ${w}x${h}`);
    },
    drawImage(_image, sx, sy, sw, sh, dx, dy) {
      sources.push(`${sx},${sy} ${sw}x${sh} -> ${dx},${dy}`);
    },
  };
  return { painter, sources, fills };
}

const MANIFEST: SkinManifest = {
  schemaVersion: 1,
  name: 'Test',
  image: 'sprite.png',
  frameSize: { width: 48, height: 48 },
  animations: {
    idle: {
      loop: true,
      frames: [
        { index: 0, durationMs: 800, anchors: { eye: { x: 18, y: 19 } } },
        { index: 3, durationMs: 800 }, // eye closed: no anchor
      ],
    },
  },
};
const skin = { manifest: MANIFEST, image: { width: 144, height: 96 } };
const OPEN = MANIFEST.animations.idle.frames[0];
const CLOSED = MANIFEST.animations.idle.frames[1] ?? OPEN;

describe('skinAppearance', () => {
  it('draws the given frame from its cell in the sheet', () => {
    const { painter, sources } = recordingPainter();
    const appearance = skinAppearance(skin);

    appearance.draw(painter, { frame: OPEN, hovered: false });
    appearance.draw(painter, { frame: CLOSED, hovered: false });

    expect(sources).toEqual(['0,0 48x48 -> 0,0', '0,48 48x48 -> 0,0']);
  });

  it('draws the pupil at the eye anchor, red while hovered', () => {
    const { painter, fills } = recordingPainter();
    const appearance = skinAppearance(skin);

    appearance.draw(painter, { frame: OPEN, hovered: false });
    appearance.draw(painter, { frame: OPEN, hovered: true });

    expect(fills).toEqual([`${PUPIL_COLOR} 18,19 2x2`, `${PUPIL_HOVER_COLOR} 18,19 2x2`]);
  });

  it('draws no pupil on frames with a closed eye', () => {
    const { painter, fills } = recordingPainter();

    skinAppearance(skin).draw(painter, { frame: CLOSED, hovered: true });

    expect(fills).toEqual([]);
  });
});

describe('skinAppearance shadow', () => {
  const withFeet = (feet: { x: number; y: number } | undefined, idleFeet = { x: 24, y: 46 }) => ({
    manifest: {
      ...MANIFEST,
      animations: {
        idle: {
          loop: true,
          frames: [
            { index: 0, durationMs: 800, anchors: { feet: idleFeet } },
            { index: 1, durationMs: 800, anchors: feet ? { feet } : {} },
          ],
        },
      },
    } as SkinManifest,
    image: { width: 144, height: 96 },
  });

  const second = (s: ReturnType<typeof withFeet>) => {
    const frame = s.manifest.animations.idle.frames[1];
    if (!frame) throw new Error('fixture needs two frames');
    return frame;
  };

  it('draws the shadow before the sprite, on the ground line', () => {
    const order: string[] = [];
    const painter: SpritePainter<FakeImage> = {
      fillStyle: '',
      fillRect(_x, y) {
        order.push(`${String(this.fillStyle)}@${y}`);
      },
      drawImage() {
        order.push('sprite');
      },
    };

    const shadowed = withFeet({ x: 24, y: 46 });
    skinAppearance(shadowed).draw(painter, { frame: second(shadowed), hovered: false });

    expect(order).toEqual([
      `${SHADOW_COLOR}@45`,
      `${SHADOW_COLOR}@46`,
      `${SHADOW_COLOR}@47`,
      'sprite',
    ]);
  });

  it('casts no shadow for a frame without feet', () => {
    const { painter, fills } = recordingPainter();

    const unshadowed = withFeet(undefined);
    skinAppearance(unshadowed).draw(painter, { frame: second(unshadowed), hovered: false });

    expect(fills).toEqual([]);
  });

  it('casts no shadow when the skin does not say where the ground is', () => {
    const { painter, fills } = recordingPainter();
    const skin = withFeet({ x: 24, y: 46 });
    skin.manifest.animations.idle.frames[0].anchors = {};

    skinAppearance(skin).draw(painter, { frame: second(skin), hovered: false });

    expect(fills).toEqual([]);
  });
});

describe('placeholderAppearance', () => {
  it('draws the blocky placeholder, bobbing with the frame index', () => {
    const first = recordingPainter();
    const second = recordingPainter();
    const appearance = placeholderAppearance<FakeImage>();

    const [still, bobbed] = PLACEHOLDER_ANIMATIONS.idle.frames;
    appearance.draw(first.painter, { frame: still, hovered: false });
    appearance.draw(second.painter, { frame: bobbed ?? still, hovered: false });

    const [, x, y, w, h] = PLACEHOLDER_BLOCKS[0] ?? [];
    expect(first.fills[0]).toContain(`${x},${y} ${w}x${h}`);
    expect(second.fills[0]).toContain(`${x},${(y ?? 0) + 1} ${w}x${h}`);
    expect(first.sources).toEqual([]);
  });
});
