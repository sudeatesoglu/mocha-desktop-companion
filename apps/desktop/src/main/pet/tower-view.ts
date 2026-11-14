import { type BreakState, isTired, type NeedsState, treatsLeft } from '@mocha/core';
import type { TowerView } from '../../shared/tower.ts';

const MINUTE_MS = 60_000;

/** What the Tower shows of Mocha's needs at `now`: rounded, never raw state. */
export function towerView(needs: NeedsState, breaks: BreakState, now: number): TowerView {
  return {
    mood: Math.round(needs.mood),
    energy: Math.round(needs.energy),
    tired: isTired(needs),
    treatsLeft: treatsLeft(needs, now),
    resting: breaks.phase === 'onBreak',
    paused: breaks.phase === 'paused',
    // Whole minutes, so the view changes once a minute, not on every tick.
    focusMinutesLeft:
      breaks.phase === 'focusing'
        ? Math.max(0, Math.ceil((breaks.endsAt - now) / MINUTE_MS))
        : null,
  };
}
