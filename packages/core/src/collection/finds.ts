import { localDay } from '../time/local-day.ts';
import { ITEMS, type ItemId } from './items.ts';

const MINUTE_MS = 60_000;

/** The tuning knobs of the find meter (ADR-0010). */
export interface FindsConfig {
  /** Work before a break for it to earn points, so breaks back to back earn nothing. */
  readonly minWorkMs: number;
  /** A break at least this long earns a point. */
  readonly minBreakMs: number;
  /** Points that make a find. */
  readonly pointsPerFind: number;
  /** Finds per local day. */
  readonly findsPerDay: number;
}

export const DEFAULT_FINDS_CONFIG: FindsConfig = Object.freeze({
  minWorkMs: 20 * MINUTE_MS,
  minBreakMs: 5 * MINUTE_MS,
  pointsPerFind: 3,
  findsPerDay: 2,
});

/** Something Mocha found, and when. */
export interface Find {
  readonly id: ItemId;
  readonly foundAt: number;
}

export interface FindsState {
  /** What Mocha found, oldest first. */
  readonly found: readonly Find[];
  /** Points towards the next find, never more than one find's worth. */
  readonly points: number;
  /** Start of the local day that `findsToday` counts. */
  readonly day: number;
  readonly findsToday: number;
}

export type FindsEvent = {
  /** A break ended at `now`. */
  readonly type: 'breakEnded';
  readonly now: number;
  /** How long the user worked before the break. */
  readonly workMs: number;
  /** How long the break lasted. */
  readonly breakMs: number;
  /** A ritual earned Mocha's mood during the break. */
  readonly ritual: boolean;
};

/** An empty collection and meter. */
export function startFinds(now: number): FindsState {
  return { found: [], points: 0, day: localDay(now).start, findsToday: 0 };
}

/**
 * Points a break earns: only after a real stretch of work, one for a long
 * enough break and one for a ritual done in it.
 */
export function pointsForBreak(
  event: FindsEvent,
  config: FindsConfig = DEFAULT_FINDS_CONFIG,
): number {
  if (event.workMs < config.minWorkMs) return 0;
  return (event.breakMs >= config.minBreakMs ? 1 : 0) + (event.ritual ? 1 : 0);
}

/** The items Mocha has not found yet, in catalog order. */
function notFound(state: FindsState): ItemId[] {
  const found = new Set(state.found.map(({ id }) => id));
  return ITEMS.map(({ id }) => id).filter((id) => !found.has(id));
}

/**
 * The find meter as a pure function. The timing is predictable: every few
 * points, within a daily cap. Only which item comes is left to `random`
 * (a number in [0, 1)). Returns the same object when nothing changed.
 */
export function reduceFinds(
  state: FindsState,
  event: FindsEvent,
  random: () => number,
  config: FindsConfig = DEFAULT_FINDS_CONFIG,
): FindsState {
  let left = notFound(state);
  if (left.length === 0) return state;

  const day = localDay(event.now).start;
  let findsToday = day === state.day ? state.findsToday : 0;
  let points = state.points + pointsForBreak(event, config);
  const found = [...state.found];
  while (points >= config.pointsPerFind && findsToday < config.findsPerDay && left.length > 0) {
    // In range, since `left` is not empty: the cast only drops `undefined`.
    const id = left[Math.min(left.length - 1, Math.floor(random() * left.length))] as ItemId;
    found.push({ id, foundAt: event.now });
    left = left.filter((other) => other !== id);
    points -= config.pointsPerFind;
    findsToday += 1;
  }
  // A full meter waits for the next day; once everything is found it stops.
  points = left.length === 0 ? 0 : Math.min(points, config.pointsPerFind);

  const unchanged =
    found.length === state.found.length &&
    points === state.points &&
    day === state.day &&
    findsToday === state.findsToday;
  return unchanged ? state : { found, points, day, findsToday };
}

/** What the meter shows at `now`. */
export function findStatus(
  state: FindsState,
  now: number,
  config: FindsConfig = DEFAULT_FINDS_CONFIG,
): {
  readonly points: number;
  readonly pointsPerFind: number;
  /** Finds still possible today; 0 once the collection is complete. */
  readonly findsLeftToday: number;
  readonly complete: boolean;
} {
  const complete = notFound(state).length === 0;
  const today = localDay(now).start === state.day ? state.findsToday : 0;
  return {
    points: complete ? 0 : state.points,
    pointsPerFind: config.pointsPerFind,
    findsLeftToday: complete ? 0 : Math.max(0, config.findsPerDay - today),
    complete,
  };
}
