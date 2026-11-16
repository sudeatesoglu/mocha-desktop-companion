import {
  type BreakState,
  type FindsState,
  findStatus,
  ITEMS,
  isTired,
  itemById,
  type Look,
  type NeedsState,
  treatsLeft,
} from '@mocha/core';
import type { TowerView } from '../../shared/tower.ts';

const MINUTE_MS = 60_000;

// Whole minutes, so the view changes once a minute, not on every tick.
const minutesLeft = (endsAt: number, now: number) =>
  Math.max(0, Math.ceil((endsAt - now) / MINUTE_MS));

/** What the Tower shows of Mocha at `now`: rounded, never raw state. */
export function towerView(
  {
    needs,
    breaks,
    finds,
    look,
  }: { needs: NeedsState; breaks: BreakState; finds: FindsState; look: Look },
  now: number,
): TowerView {
  const status = findStatus(finds, now);
  const latest = finds.found.at(-1);
  const found = new Set(finds.found.map(({ id }) => id));
  const accessories = ITEMS.filter((item) => item.kind === 'accessory');
  return {
    mood: Math.round(needs.mood),
    energy: Math.round(needs.energy),
    tired: isTired(needs),
    treatsLeft: treatsLeft(needs, now),
    paused: breaks.phase === 'paused',
    breakMinutesLeft: breaks.phase === 'onBreak' ? minutesLeft(breaks.endsAt, now) : null,
    focusMinutesLeft: breaks.phase === 'focusing' ? minutesLeft(breaks.endsAt, now) : null,
    finds: {
      points: status.points,
      pointsPerFind: status.pointsPerFind,
      waiting: !status.complete && status.findsLeftToday === 0,
      complete: status.complete,
      found: finds.found.length,
      total: ITEMS.length,
      latest: latest ? itemById(latest.id).title : null,
    },
    look,
    wardrobe: {
      items: accessories
        .filter(({ id }) => found.has(id))
        .map(({ id, title, slot }) => ({ id, title, slot, worn: look[slot] === id })),
      toFind: accessories.filter(({ id }) => !found.has(id)).length,
    },
  };
}
