import { type BreakState, isTired, type NeedsState, treatsLeft } from '@mocha/core';
import type { TowerView } from '../../shared/tower.ts';

const MINUTE_MS = 60_000;

// Whole minutes, so the view changes once a minute, not on every tick.
const minutesLeft = (endsAt: number, now: number) =>
  Math.max(0, Math.ceil((endsAt - now) / MINUTE_MS));

/** What the Tower shows of Mocha's needs at `now`: rounded, never raw state. */
export function towerView(needs: NeedsState, breaks: BreakState, now: number): TowerView {
  return {
    mood: Math.round(needs.mood),
    energy: Math.round(needs.energy),
    tired: isTired(needs),
    treatsLeft: treatsLeft(needs, now),
    paused: breaks.phase === 'paused',
    breakMinutesLeft: breaks.phase === 'onBreak' ? minutesLeft(breaks.endsAt, now) : null,
    focusMinutesLeft: breaks.phase === 'focusing' ? minutesLeft(breaks.endsAt, now) : null,
  };
}
