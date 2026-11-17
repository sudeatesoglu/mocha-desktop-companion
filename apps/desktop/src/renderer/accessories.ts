import type { ItemId, Look } from '@mocha/core';
import type { PixelPainter } from './placeholder-sprite.ts';

interface Point {
  x: number;
  y: number;
}

/** Where accessories attach; one whose anchor is missing is not drawn. */
export interface AccessoryAnchors {
  head?: Point | undefined;
  neck?: Point | undefined;
}

// Colors from the ink palette and its glows (docs/skins.md).
const COLORS = {
  E: '#2fa37a', // eerie green
  G: '#ffd27a', // warm glow
  L: '#a8a1a6', // light gray
  R: '#c2213a', // blood red
  r: '#7a1020', // dark red
  W: '#f2eee6', // paper white
} as const;

interface Art {
  anchor: keyof AccessoryAnchors;
  /** Top-left of the picture, relative to the anchor. */
  x: number;
  y: number;
  /** Rows of color keys; '.' is transparent. */
  rows: readonly string[];
}

/**
 * Placeholder accessories, drawn in code until the artist's versions
 * replace them (ADR-0010). Mocha faces left: the front is at low x.
 */
const ART: Partial<Record<ItemId, Art>> = {
  // A band around the neck, tied at the front, with the ends hanging down.
  redScarf: {
    anchor: 'neck',
    x: -3,
    y: -1,
    rows: [
      '...RRRRRRRRRRRRRRR',
      '..RRRrRRRRRRRRRRRr',
      '.RRrRrrrrrrrrrrrr.',
      'RRr.R.............',
      'RR..RR............',
      '.R...R............',
    ],
  },
  bowTie: { anchor: 'neck', x: -3, y: -1, rows: ['RR.RR', 'RRrRR', 'RR.RR'] },
  // A thin chain down to a crescent moon resting on the chest.
  moonPendant: {
    anchor: 'neck',
    x: 0,
    y: 0,
    rows: ['L...', '.L..', '..L.', '..L.', '.WW.', 'WG..', 'W...', '.WW.'],
  },
  // A red feather tucked into the back of the hat band.
  hatFeather: {
    anchor: 'head',
    x: 5,
    y: -4,
    rows: [
      '......RR',
      '.....RRr',
      '....RRr.',
      '...RRr..',
      '..RRr...',
      '.RRr....',
      '.Rr.....',
      'Rr......',
      'r.......',
    ],
  },
  // A small flower with a leaf at the front of the hat band.
  hatFlower: { anchor: 'head', x: -6, y: 3, rows: ['.WW..', 'WGGW.', 'WGGW.', '.WWEE', '...E.'] },
};

/** Draws what Mocha wears at its anchors: the neck first, then the hat. */
export function drawAccessories(
  painter: PixelPainter,
  anchors: AccessoryAnchors,
  look: Look,
): void {
  for (const id of [look.neck, look.hat]) {
    const art = id ? ART[id] : undefined;
    const at = art && anchors[art.anchor];
    if (!art || !at) continue;
    art.rows.forEach((row, dy) => {
      [...row].forEach((key, dx) => {
        if (key === '.') return;
        painter.fillStyle = COLORS[key as keyof typeof COLORS];
        painter.fillRect(at.x + art.x + dx, at.y + art.y + dy, 1, 1);
      });
    });
  }
}
