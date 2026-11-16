import type { DecorSlot, ItemId, Room } from '@mocha/core';
import type { PixelPainter } from './placeholder-sprite.ts';

// The Tower's ink-and-glow palette (notes in docs/skins.md): orange glows
// for rest, green for magic.
const COLORS = {
  K: '#0d0b0e', // ink
  M: '#5a5260', // mid gray
  L: '#a8a1a6', // light gray
  W: '#f2eee6', // paper
  C: '#efe2cc', // cream
  B: '#5a3d2e', // wood
  T: '#8a5a3c', // terracotta
  P: '#c4a8e4', // lavender
  b: '#8e3b4f', // plum
  O: '#e0892b', // warm glow
  Y: '#ffd27a', // warm light
  e: '#12403a', // dark green
  E: '#2fa37a', // green
  g: '#9ff0c4', // pale green glow
} as const;

/** Where each slot sits in the room: the point an item stands on (or hangs from). */
export const DECOR_SLOTS: Readonly<Record<DecorSlot, { x: number; y: number }>> = {
  shelf: { x: 24, y: 17 }, // on the upper shelf
  wall: { x: 56, y: 9 }, // the nail between the shelves and the window
  sill: { x: 100, y: 39 }, // on the window sill
  floor: { x: 18, y: 66 }, // in the corner by the wall
};

interface Art {
  /** Top-left of the picture, relative to its slot's point. */
  x: number;
  y: number;
  /** Rows of color keys; '.' is transparent. */
  rows: readonly string[];
}

/** Placeholder decor, drawn in code until the artist's room replaces it (ADR-0010). */
const ART: Partial<Record<ItemId, Art>> = {
  crystalBall: {
    x: -3,
    y: -8,
    rows: ['..eee..', '.eEgEe.', 'eEgEEEe', 'eEEEEEe', '.eEEEe.', '..eee..', '.BBBBB.', 'BBBBBBB'],
  },
  bookStack: {
    x: -5,
    y: -6,
    rows: ['.PPPPPPP..', '.PCCCCCP..', 'bbbbbbbbb.', 'bCCCCCCCb.', 'TTTTTTTTTT', 'TCCCCCCCCT'],
  },
  inkDrawing: {
    x: -7,
    y: 0,
    rows: [
      'BBBBBBBBBBBBBB',
      'BWWWWWWWWWWWWB',
      'BWWWWWWWWKKWWB',
      'BWWWWWWWWKWWWB',
      'BWWWWWWWWKKWWB',
      'BWWKKWWWWWWWWB',
      'BWKKKKWWWWWWWB',
      'BWWKKKKKWWWWWB',
      'BWWWKKKWWWWWWB',
      'BWWWWKWKWWWWWB',
      'BWWWWWWWWWWWWB',
      'BBBBBBBBBBBBBB',
    ],
  },
  lantern: {
    x: -3,
    y: -8,
    rows: ['..MMM..', '...M...', '.MMMMM.', '.MYOYM.', '.MOYOM.', '.MYOYM.', '.MMMMM.', '..MMM..'],
  },
  teacup: {
    x: -4,
    y: -6,
    rows: ['..L.L....', '...L.L...', '.WWWWWW..', '.WTTTTWWW', '..WWWW..W', 'WWWWWWWW.'],
  },
  fern: {
    x: -6,
    y: -15,
    rows: [
      '....E..E.....',
      '..E..E.E..E..',
      '.E.E.EEE.E...',
      'E..EeEeEE..E.',
      '..EeEEEeEE.E.',
      '.EEeEEEEeEE..',
      'E..EeEEEe..E.',
      '...EeEEe.E...',
      '..E.eEe......',
      '....TTTTT....',
      '...TTTTTTT...',
      '...BTTTTTB...',
      '....TTTTT....',
      '....TTTTT....',
      '.....TTT.....',
    ],
  },
};

/** Draws the decor placed in the room's slots. */
export function drawDecor(painter: PixelPainter, room: Room): void {
  for (const slot of Object.keys(DECOR_SLOTS) as DecorSlot[]) {
    const id = room[slot];
    const art = id ? ART[id] : undefined;
    if (!art) continue;
    const at = DECOR_SLOTS[slot];
    art.rows.forEach((row, dy) => {
      [...row].forEach((key, dx) => {
        if (key === '.') return;
        painter.fillStyle = COLORS[key as keyof typeof COLORS];
        painter.fillRect(at.x + art.x + dx, at.y + art.y + dy, 1, 1);
      });
    });
  }
}
