import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NEEDS_CONFIG,
  isTired,
  type NeedsConfig,
  type NeedsEvent,
  type NeedsState,
  reduceNeeds,
  startNeeds,
  treatsLeft,
} from './needs.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// The rules are tested with fixed numbers, so tuning a default does not
// change what these tests mean.
const config: NeedsConfig = {
  neutralMood: 60,
  moodHalfLifeMs: 4 * HOUR,
  breakMood: 10,
  minBreakMs: 3 * MINUTE,
  petMood: 2,
  petCooldownMs: 5 * MINUTE,
  treatMood: 6,
  treatsPerDay: 3,
  energyDrainPerHour: 30,
  energyRestorePerHour: 120,
  tiredBelow: 25,
};

/** 09:00 on a fixed local day, so treat days are easy to reason about. */
const MORNING = new Date(2026, 10, 13, 9, 0).getTime();

const play = (events: NeedsEvent[], from: NeedsState = startNeeds(MORNING, config)) =>
  events.reduce((state, event) => reduceNeeds(state, event, config), from);
const elapse = (minutes: number, activity: 'work' | 'rest' | 'paused'): NeedsEvent => ({
  type: 'elapse',
  now: MORNING + minutes * MINUTE,
  activity,
});
const at = (minutes: number) => MORNING + minutes * MINUTE;

describe('startNeeds', () => {
  it('starts rested, in a neutral mood, with no pets or treats yet', () => {
    expect(startNeeds(MORNING, config)).toEqual({
      mood: 60,
      energy: 100,
      updatedAt: MORNING,
      lastPetAt: null,
      treatDay: new Date(2026, 10, 13).getTime(),
      treatsToday: 0,
    });
  });

  it('uses the default config when none is given', () => {
    expect(startNeeds(MORNING).mood).toBe(DEFAULT_NEEDS_CONFIG.neutralMood);
  });
});

describe('energy', () => {
  it('drains while working and refills while resting', () => {
    const afterWork = play([elapse(60, 'work')]);
    expect(afterWork.energy).toBe(70);

    const afterRest = play([elapse(10, 'rest')], afterWork);
    expect(afterRest.energy).toBe(70); // the clock is already past minute 10: no time passes

    expect(play([elapse(70, 'rest')], afterWork).energy).toBe(90);
  });

  it('balances 40 minutes of work with a 10-minute break', () => {
    const state = play([elapse(60, 'work'), elapse(100, 'work'), elapse(110, 'rest')]);

    expect(state.energy).toBeCloseTo(70, 10);
  });

  it('never leaves 0 to 100', () => {
    expect(play([elapse(10 * 60, 'work')]).energy).toBe(0);
    expect(play([elapse(60, 'work'), elapse(10 * 60, 'rest')]).energy).toBe(100);
  });

  it('counts time while the app was closed as rest, when the caller says so', () => {
    const tired = play([elapse(120, 'work')]);

    expect(play([elapse(8 * 60, 'rest')], tired).energy).toBe(100);
  });

  it('looks tired below the threshold', () => {
    expect(isTired(play([elapse(150, 'work')]), config)).toBe(false); // energy 25
    expect(isTired(play([elapse(152, 'work')]), config)).toBe(true);
    expect(isTired(startNeeds(MORNING))).toBe(false);
  });
});

describe('mood', () => {
  it('rises with a completed break, but not with a short pause', () => {
    expect(play([{ type: 'breakCompleted', durationMs: 10 * MINUTE }]).mood).toBe(70);
    expect(play([{ type: 'breakCompleted', durationMs: 2 * MINUTE }]).mood).toBe(60);
  });

  it('drifts halfway back to neutral every half-life, from above and from below', () => {
    const happy = { ...startNeeds(MORNING, config), mood: 100 };
    const glum = { ...startNeeds(MORNING, config), mood: 20 };

    expect(play([elapse(4 * 60, 'work')], happy).mood).toBeCloseTo(80, 10);
    expect(play([elapse(4 * 60, 'rest')], glum).mood).toBeCloseTo(40, 10);
  });

  it('never runs out on its own', () => {
    expect(play([elapse(30 * 24 * 60, 'work')]).mood).toBeCloseTo(60, 5);
  });

  it('stays at or below 100', () => {
    const full = { ...startNeeds(MORNING, config), mood: 95 };

    expect(play([{ type: 'breakCompleted', durationMs: HOUR }], full).mood).toBe(100);
  });
});

describe('pets', () => {
  it('count once per cooldown', () => {
    const first = play([{ type: 'pet', now: at(0) }]);
    expect(first).toMatchObject({ mood: 62, lastPetAt: at(0) });

    expect(reduceNeeds(first, { type: 'pet', now: at(4) }, config)).toBe(first);
    expect(reduceNeeds(first, { type: 'pet', now: at(5) }, config).mood).toBe(64);
  });

  it('are not blocked for long when the clock was set back', () => {
    const petted = play([{ type: 'pet', now: at(60) }]);

    expect(reduceNeeds(petted, { type: 'pet', now: at(0) }, config).mood).toBe(64);
  });
});

describe('treats', () => {
  it('are accepted a few times a day, then politely refused', () => {
    const treat = (minutes: number): NeedsEvent => ({ type: 'treat', now: at(minutes) });
    const three = play([treat(0), treat(1), treat(2)]);

    expect(three).toMatchObject({ mood: 78, treatsToday: 3 });
    expect(treatsLeft(three, at(3), config)).toBe(0);
    expect(reduceNeeds(three, treat(3), config)).toBe(three);
  });

  it('are counted again from local midnight', () => {
    const three = play([0, 1, 2].map((minutes) => ({ type: 'treat', now: at(minutes) })));
    const tomorrow = new Date(2026, 10, 14, 8, 0).getTime();

    expect(treatsLeft(three, tomorrow, config)).toBe(3);
    expect(reduceNeeds(three, { type: 'treat', now: tomorrow }, config)).toMatchObject({
      treatDay: new Date(2026, 10, 14).getTime(),
      treatsToday: 1,
    });
  });

  it('uses the default config when none is given', () => {
    expect(treatsLeft(startNeeds(MORNING), MORNING)).toBe(DEFAULT_NEEDS_CONFIG.treatsPerDay);
  });
});

describe('time', () => {
  it('changes nothing while paused, but moves the clock on', () => {
    const tired = play([elapse(60, 'work')]);

    expect(play([elapse(180, 'paused')], tired)).toEqual({ ...tired, updatedAt: at(180) });
  });

  it('returns the same state when no time passed', () => {
    const state = startNeeds(MORNING, config);

    expect(reduceNeeds(state, elapse(0, 'work'), config)).toBe(state);
  });

  it('counts a clock set back as no time at all', () => {
    const later = play([elapse(60, 'work')]);

    expect(play([elapse(30, 'work')], later)).toEqual({ ...later, updatedAt: at(30) });
  });

  it('keeps both needs within 0 to 100 under any sequence of events', () => {
    // A seeded generator, so a failure can be replayed.
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const activities = ['work', 'rest', 'paused'] as const;
    let state = startNeeds(MORNING, config);
    let now = MORNING;
    for (let i = 0; i < 2_000; i++) {
      now += Math.floor(random() * 3 * HOUR);
      const roll = random();
      const event: NeedsEvent =
        roll < 0.5
          ? { type: 'elapse', now, activity: activities[Math.floor(random() * 3)] ?? 'work' }
          : roll < 0.7
            ? { type: 'breakCompleted', durationMs: random() * HOUR }
            : roll < 0.85
              ? { type: 'pet', now }
              : { type: 'treat', now };
      state = reduceNeeds(state, event, config);
      expect(state.mood).toBeGreaterThanOrEqual(0);
      expect(state.mood).toBeLessThanOrEqual(100);
      expect(state.energy).toBeGreaterThanOrEqual(0);
      expect(state.energy).toBeLessThanOrEqual(100);
    }
  });
});
