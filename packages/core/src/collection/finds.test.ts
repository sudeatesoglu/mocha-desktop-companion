import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FINDS_CONFIG,
  type FindsEvent,
  type FindsState,
  findStatus,
  pointsForBreak,
  reduceFinds,
  startFinds,
} from './finds.ts';
import { ITEMS } from './items.ts';

const MINUTE = 60_000;
/** A local time on a given day of November 2026. */
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).getTime();

/** A break after 40 minutes of work, 10 minutes long, ending at `now`. */
const rest = (now: number, patch: Partial<FindsEvent> = {}): FindsEvent => ({
  type: 'breakEnded',
  now,
  workMs: 40 * MINUTE,
  breakMs: 10 * MINUTE,
  ritual: false,
  ...patch,
});

/** Always picks the first item not found yet. */
const first = () => 0;

const play = (events: FindsEvent[], from: FindsState = startFinds(at(16, 8))) =>
  events.reduce((state, event) => reduceFinds(state, event, first), from);

describe('defaults', () => {
  it('needs 20 minutes of work, a 5-minute break and 3 points, and finds 2 a day', () => {
    expect(DEFAULT_FINDS_CONFIG).toEqual({
      minWorkMs: 20 * MINUTE,
      minBreakMs: 5 * MINUTE,
      pointsPerFind: 3,
      findsPerDay: 2,
    });
  });
});

describe('pointsForBreak', () => {
  it('gives a point for a long enough break and one for a ritual', () => {
    expect(pointsForBreak(rest(0))).toBe(1);
    expect(pointsForBreak(rest(0, { ritual: true }))).toBe(2);
  });

  it('gives a ritual its point even in a short break', () => {
    expect(pointsForBreak(rest(0, { breakMs: 2 * MINUTE, ritual: true }))).toBe(1);
    expect(pointsForBreak(rest(0, { breakMs: 2 * MINUTE }))).toBe(0);
  });

  it('gives nothing for a break that did not follow a real stretch of work', () => {
    expect(pointsForBreak(rest(0, { workMs: 19 * MINUTE, ritual: true }))).toBe(0);
  });
});

describe('reduceFinds', () => {
  it('finds an item every 3 points', () => {
    const twice = play([rest(at(16, 9)), rest(at(16, 10))]);
    expect(twice.found).toEqual([]);
    expect(twice.points).toBe(2);

    const thrice = play([rest(at(16, 9)), rest(at(16, 10)), rest(at(16, 11))]);
    expect(thrice.found).toEqual([{ id: 'redScarf', foundAt: at(16, 11) }]);
    expect(thrice.points).toBe(0);
  });

  it('keeps the points left over after a find', () => {
    const state = play([rest(at(16, 9), { ritual: true }), rest(at(16, 10), { ritual: true })]);

    expect(state.found).toHaveLength(1);
    expect(state.points).toBe(1);
  });

  it('never finds an item twice', () => {
    const state = play(Array.from({ length: 6 }, (_, i) => rest(at(16, 9 + i))));

    expect(state.found.map(({ id }) => id)).toEqual(['redScarf', 'bowTie']);
  });

  it('lets the random source pick among the items not found yet', () => {
    const last = () => 0.999;
    const state = [rest(at(16, 9)), rest(at(16, 10)), rest(at(16, 11))].reduce(
      (current, event) => reduceFinds(current, event, last),
      startFinds(at(16, 8)),
    );

    expect(state.found[0]?.id).toBe(ITEMS.at(-1)?.id);
  });

  it('finds at most 2 a day, and a full meter waits for the next day', () => {
    const day = Array.from({ length: 9 }, (_, i) => rest(at(16, 9 + i)));
    const evening = play(day);

    expect(evening.found).toHaveLength(2);
    expect(evening.findsToday).toBe(2);
    expect(evening.points).toBe(3);
    expect(findStatus(evening, at(16, 20))).toMatchObject({ points: 3, findsLeftToday: 0 });

    // The first break of the next day finds what was waiting, even a short one.
    const morning = play([rest(at(17, 9), { breakMs: MINUTE })], evening);
    expect(morning.found).toHaveLength(3);
    expect(morning.findsToday).toBe(1);
    expect(morning.points).toBe(0);
  });

  it('finds the whole collection in 6 days of a 40/10 rhythm', () => {
    let state = startFinds(at(16, 8));
    for (let day = 16; day < 22; day++) {
      for (let i = 0; i < 8; i++) state = reduceFinds(state, rest(at(day, 9, i * 50)), first);
    }

    expect(state.found).toHaveLength(ITEMS.length);
    expect(findStatus(state, at(22, 9))).toEqual({
      points: 0,
      pointsPerFind: 3,
      findsLeftToday: 0,
      complete: true,
    });
  });

  it('changes nothing once everything is found', () => {
    const complete: FindsState = {
      found: ITEMS.map(({ id }) => ({ id, foundAt: at(16, 9) })),
      points: 0,
      day: at(16, 0),
      findsToday: 2,
    };

    expect(reduceFinds(complete, rest(at(17, 9), { ritual: true }), first)).toBe(complete);
  });

  it('returns the same object for a break that earns nothing on the same day', () => {
    const state = play([rest(at(16, 9))]);

    expect(reduceFinds(state, rest(at(16, 10), { workMs: 0 }), first)).toBe(state);
  });

  it('starts counting a new day at the first break of that day', () => {
    const state = play([rest(at(17, 9), { workMs: 0 })]);

    expect(state.day).toBe(at(17, 0));
    expect(state.findsToday).toBe(0);
  });
});

describe('findStatus', () => {
  it('shows the points towards the next find and the finds left today', () => {
    expect(findStatus(play([rest(at(16, 9))]), at(16, 9))).toEqual({
      points: 1,
      pointsPerFind: 3,
      findsLeftToday: 2,
      complete: false,
    });
  });

  it('counts a new day as a fresh one before any break', () => {
    const evening = play(Array.from({ length: 6 }, (_, i) => rest(at(16, 9 + i))));

    expect(findStatus(evening, at(16, 22)).findsLeftToday).toBe(0);
    expect(findStatus(evening, at(17, 8)).findsLeftToday).toBe(2);
  });
});
