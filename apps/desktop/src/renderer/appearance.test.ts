import type { SkinManifest } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { placeholderAppearance, type SpritePainter, skinAppearance } from './appearance.ts';
import { PLACEHOLDER_BLOCKS } from './placeholder-sprite.ts';
import { PUPIL_COLOR, PUPIL_HOVER_COLOR } from './pupil.ts';

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

describe('skinAppearance', () => {
  it('draws the idle frame for the phase from its cell in the sheet', () => {
    const { painter, sources } = recordingPainter();
    const appearance = skinAppearance(skin);

    appearance.draw(painter, { phase: 0, hovered: false });
    appearance.draw(painter, { phase: 1, hovered: false });
    appearance.draw(painter, { phase: 2, hovered: false }); // wraps around

    expect(sources).toEqual(['0,0 48x48 -> 0,0', '0,48 48x48 -> 0,0', '0,0 48x48 -> 0,0']);
  });

  it('falls back to the first idle frame for a phase outside the frame list', () => {
    const { painter, sources } = recordingPainter();

    skinAppearance(skin).draw(painter, { phase: -1, hovered: false });

    expect(sources).toEqual(['0,0 48x48 -> 0,0']);
  });

  it('draws the pupil at the eye anchor, red while hovered', () => {
    const { painter, fills } = recordingPainter();
    const appearance = skinAppearance(skin);

    appearance.draw(painter, { phase: 0, hovered: false });
    appearance.draw(painter, { phase: 0, hovered: true });

    expect(fills).toEqual([`${PUPIL_COLOR} 18,19 2x2`, `${PUPIL_HOVER_COLOR} 18,19 2x2`]);
  });

  it('draws no pupil on frames with a closed eye', () => {
    const { painter, fills } = recordingPainter();

    skinAppearance(skin).draw(painter, { phase: 1, hovered: true });

    expect(fills).toEqual([]);
  });
});

describe('placeholderAppearance', () => {
  it('draws the blocky placeholder, bobbing with the phase', () => {
    const first = recordingPainter();
    const second = recordingPainter();
    const appearance = placeholderAppearance<FakeImage>();

    appearance.draw(first.painter, { phase: 0, hovered: false });
    appearance.draw(second.painter, { phase: 1, hovered: false });

    const [, x, y, w, h] = PLACEHOLDER_BLOCKS[0] ?? [];
    expect(first.fills[0]).toContain(`${x},${y} ${w}x${h}`);
    expect(second.fills[0]).toContain(`${x},${(y ?? 0) + 1} ${w}x${h}`);
    expect(first.sources).toEqual([]);
  });
});
