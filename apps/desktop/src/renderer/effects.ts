import type { PixelPainter } from './placeholder-sprite.ts';

/** Short-lived decorations drawn on top of Mocha, anchored to its head. */
export type EffectKind = 'heart' | 'stars';

interface EffectSpec {
  durationMs: number;
  /** How often the effect's look changes; redraws happen only then. */
  frameMs: number;
  /** Pixels to paint for animation frame `n`, relative to the head anchor. */
  pixels(n: number): readonly (readonly [dx: number, dy: number])[];
  color: string;
}

// biome-ignore format: laid out as the pixel grid it draws
const HEART_SHAPE = [
  [1, 0], [3, 0],
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
  [1, 2], [2, 2], [3, 2],
  [2, 3],
] as const;

// biome-ignore format: laid out as the pixel grid it draws
const STAR_SHAPE = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] as const;

/** Four stations around the hat; stars move one station per frame. */
const ORBIT = [
  [-10, 2],
  [-5, -4],
  [4, -4],
  [9, 2],
] as const;

const offset = (shape: readonly (readonly [number, number])[], ox: number, oy: number) =>
  shape.map(([x, y]) => [x + ox, y + oy] as const);

const EFFECTS: Record<EffectKind, EffectSpec> = {
  // A heart beside the hat, rising one pixel every 300 ms (the canvas has
  // no room above the hat).
  heart: {
    durationMs: 1_200,
    frameMs: 300,
    color: '#c2213a',
    pixels: (n) => offset(HEART_SHAPE, 9, -1 - n),
  },
  // Two stars circling the hat on opposite sides.
  stars: {
    durationMs: 1_800,
    frameMs: 150,
    color: '#ffd27a',
    pixels: (n) =>
      [0, 2].flatMap((phase) => {
        const [x, y] = ORBIT[(n + phase) % ORBIT.length] ?? ORBIT[0];
        return offset(STAR_SHAPE, x, y);
      }),
  },
};

export interface Effects {
  /** Starts an effect, restarting it if it is already showing. */
  add(kind: EffectKind): void;
  /** Ages effects; returns true if anything visible changed. */
  update(stepMs: number): boolean;
  /** Paints active effects around the head anchor (skipped without one). */
  draw(painter: PixelPainter, head: { x: number; y: number } | undefined): void;
}

export function createEffects(): Effects {
  const active = new Map<EffectKind, number>(); // kind -> age in ms

  return {
    add(kind) {
      active.set(kind, 0);
    },

    update(stepMs) {
      let changed = false;
      for (const [kind, age] of active) {
        const spec = EFFECTS[kind];
        const next = age + stepMs;
        if (next >= spec.durationMs) {
          active.delete(kind);
          changed = true;
        } else {
          if (Math.floor(next / spec.frameMs) !== Math.floor(age / spec.frameMs)) changed = true;
          active.set(kind, next);
        }
      }
      return changed;
    },

    draw(painter, head) {
      if (!head) return;
      for (const [kind, age] of active) {
        const spec = EFFECTS[kind];
        painter.fillStyle = spec.color;
        for (const [dx, dy] of spec.pixels(Math.floor(age / spec.frameMs))) {
          painter.fillRect(head.x + dx, head.y + dy, 1, 1);
        }
      }
    },
  };
}
