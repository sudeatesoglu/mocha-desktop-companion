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
const STRAIGHT = { x: 0, y: 0 } as const;
const OPEN = MANIFEST.animations.idle.frames[0];
const CLOSED = MANIFEST.animations.idle.frames[1] ?? OPEN;

describe('skinAppearance', () => {
  it('draws the given frame from its cell in the sheet', () => {
    const { painter, sources } = recordingPainter();
    const appearance = skinAppearance(skin);

    appearance.draw(painter, { frame: OPEN, hovered: false, gaze: STRAIGHT });
    appearance.draw(painter, { frame: CLOSED, hovered: false, gaze: STRAIGHT });

    expect(sources).toEqual(['0,0 48x48 -> 0,0', '0,48 48x48 -> 0,0']);
  });

  it('draws the pupil at the eye anchor, red while hovered', () => {
    const { painter, fills } = recordingPainter();
    const appearance = skinAppearance(skin);

    appearance.draw(painter, { frame: OPEN, hovered: false, gaze: STRAIGHT });
    appearance.draw(painter, { frame: OPEN, hovered: true, gaze: STRAIGHT });

    expect(fills).toEqual([`${PUPIL_COLOR} 18,19 2x2`, `${PUPIL_HOVER_COLOR} 18,19 2x2`]);
  });

  it('shifts the pupil one pixel in the direction of the gaze', () => {
    const { painter, fills } = recordingPainter();

    skinAppearance(skin).draw(painter, { frame: OPEN, hovered: false, gaze: { x: -1, y: 1 } });

    expect(fills).toEqual([`${PUPIL_COLOR} 17,20 2x2`]);
  });

  it('reports the head anchor of the frame', () => {
    const appearance = skinAppearance(skin);
    const withHead = { index: 0, durationMs: 100, anchors: { head: { x: 23, y: 5 } } };

    expect(appearance.head(withHead)).toEqual({ x: 23, y: 5 });
    expect(appearance.head(OPEN)).toBeUndefined();
    const withFeet = { index: 0, durationMs: 100, anchors: { feet: { x: 24, y: 46 } } };
    expect(appearance.feet(withFeet)).toEqual({ x: 24, y: 46 });
    expect(appearance.feet(OPEN)).toBeUndefined();
  });

  it('reports the eye center for open eyes only', () => {
    const appearance = skinAppearance(skin);

    expect(appearance.eyeCenter(OPEN)).toEqual({ x: 19, y: 20 });
    expect(appearance.eyeCenter(CLOSED)).toBeUndefined();
  });

  it('draws no pupil on frames with a closed eye', () => {
    const { painter, fills } = recordingPainter();

    skinAppearance(skin).draw(painter, { frame: CLOSED, hovered: true, gaze: STRAIGHT });

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
    skinAppearance(shadowed).draw(painter, {
      frame: second(shadowed),
      hovered: false,
      gaze: STRAIGHT,
    });

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
    skinAppearance(unshadowed).draw(painter, {
      frame: second(unshadowed),
      hovered: false,
      gaze: STRAIGHT,
    });

    expect(fills).toEqual([]);
  });

  it('casts no shadow when the skin does not say where the ground is', () => {
    const { painter, fills } = recordingPainter();
    const skin = withFeet({ x: 24, y: 46 });
    skin.manifest.animations.idle.frames[0].anchors = {};

    skinAppearance(skin).draw(painter, { frame: second(skin), hovered: false, gaze: STRAIGHT });

    expect(fills).toEqual([]);
  });
});

describe('placeholderAppearance', () => {
  it('reports its eye center and head, following the bob', () => {
    const appearance = placeholderAppearance<FakeImage>();
    const [still, bobbed] = PLACEHOLDER_ANIMATIONS.idle.frames;

    expect(appearance.eyeCenter(still)).toEqual({ x: 24, y: 13 });
    expect(appearance.eyeCenter(bobbed ?? still)).toEqual({ x: 24, y: 14 });
    expect(appearance.head(still)).toEqual({ x: 24, y: 8 });
    expect(appearance.head(bobbed ?? still)).toEqual({ x: 24, y: 9 });
    expect(appearance.feet(still)).toEqual({ x: 23, y: 40 });
  });

  it('draws the blocky placeholder, bobbing with the frame index', () => {
    const first = recordingPainter();
    const second = recordingPainter();
    const appearance = placeholderAppearance<FakeImage>();

    const [still, bobbed] = PLACEHOLDER_ANIMATIONS.idle.frames;
    appearance.draw(first.painter, { frame: still, hovered: false, gaze: STRAIGHT });
    appearance.draw(second.painter, { frame: bobbed ?? still, hovered: false, gaze: STRAIGHT });

    const [, x, y, w, h] = PLACEHOLDER_BLOCKS[0] ?? [];
    expect(first.fills[0]).toContain(`${x},${y} ${w}x${h}`);
    expect(second.fills[0]).toContain(`${x},${(y ?? 0) + 1} ${w}x${h}`);
    expect(first.sources).toEqual([]);
  });
});
