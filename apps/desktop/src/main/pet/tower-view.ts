import { isTired, type NeedsState, treatsLeft } from '@mocha/core';
import type { TowerView } from '../../shared/tower.ts';

/** What the Tower shows of Mocha's needs at `now`: rounded, never raw state. */
export function towerView(needs: NeedsState, now: number): TowerView {
  return {
    mood: Math.round(needs.mood),
    energy: Math.round(needs.energy),
    tired: isTired(needs),
    treatsLeft: treatsLeft(needs, now),
  };
}
