import { localDay } from '../time/local-day.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** The tuning knobs of Mocha's needs (ADR-0008). */
export interface NeedsConfig {
  /** Where mood settles when nothing happens. */
  readonly neutralMood: number;
  /** Time for mood to get halfway back to neutral. */
  readonly moodHalfLifeMs: number;
  /** Mood gained from a completed break. */
  readonly breakMood: number;
  /** Shorter breaks do not count, so a quick pause cannot be farmed for mood. */
  readonly minBreakMs: number;
  /** Mood gained from a pet. */
  readonly petMood: number;
  /** Pets within this time after the last one that counted are just pets. */
  readonly petCooldownMs: number;
  /** Mood gained from a treat. */
  readonly treatMood: number;
  /** Treats Mocha accepts per local day. */
  readonly treatsPerDay: number;
  /** Energy lost per hour of work. */
  readonly energyDrainPerHour: number;
  /** Energy regained per hour of rest. */
  readonly energyRestorePerHour: number;
  /** Below this energy Mocha looks tired. */
  readonly tiredBelow: number;
}

export const DEFAULT_NEEDS_CONFIG: NeedsConfig = Object.freeze({
  neutralMood: 60,
  moodHalfLifeMs: 4 * HOUR_MS,
  breakMood: 10,
  minBreakMs: 3 * MINUTE_MS,
  petMood: 2,
  petCooldownMs: 5 * MINUTE_MS,
  treatMood: 6,
  treatsPerDay: 3,
  // 40 minutes of work cost about what a 10-minute break gives back.
  energyDrainPerHour: 30,
  energyRestorePerHour: 120,
  tiredBelow: 25,
});

/** Mocha's needs, both from 0 to 100, and what the caps need to remember. */
export interface NeedsState {
  readonly mood: number;
  readonly energy: number;
  /** The time up to which time has been applied. */
  readonly updatedAt: number;
  /** When a pet last counted, or null if never. */
  readonly lastPetAt: number | null;
  /** Start of the local day that `treatsToday` counts. */
  readonly treatDay: number;
  readonly treatsToday: number;
}

/** How the user spent a stretch of time. Paused time changes nothing. */
export type NeedsActivity = 'work' | 'rest' | 'paused';

export type NeedsEvent =
  /** Time passed until `now`, spent on `activity`. */
  | { readonly type: 'elapse'; readonly now: number; readonly activity: NeedsActivity }
  /** A break of `durationMs` just ended. */
  | { readonly type: 'breakCompleted'; readonly durationMs: number }
  | { readonly type: 'pet' | 'treat'; readonly now: number };

/** A rested Mocha in a neutral mood. */
export function startNeeds(now: number, config: NeedsConfig = DEFAULT_NEEDS_CONFIG): NeedsState {
  return {
    mood: config.neutralMood,
    energy: 100,
    updatedAt: now,
    lastPetAt: null,
    treatDay: localDay(now).start,
    treatsToday: 0,
  };
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

function elapse(
  state: NeedsState,
  now: number,
  activity: NeedsActivity,
  config: NeedsConfig,
): NeedsState {
  if (now === state.updatedAt) return state;
  // A clock set back counts as no time at all.
  const elapsedMs = Math.max(0, now - state.updatedAt);
  if (activity === 'paused' || elapsedMs === 0) return { ...state, updatedAt: now };

  const hours = elapsedMs / HOUR_MS;
  const energy =
    activity === 'work'
      ? state.energy - config.energyDrainPerHour * hours
      : state.energy + config.energyRestorePerHour * hours;
  // Mood eases back towards neutral from either side, never down to zero.
  const mood =
    config.neutralMood +
    (state.mood - config.neutralMood) * 0.5 ** (elapsedMs / config.moodHalfLifeMs);
  return { ...state, mood: clamp(mood), energy: clamp(energy), updatedAt: now };
}

/**
 * The rules of Mocha's needs as a pure function, like the break rules: no
 * timers and no clock. Nothing ever punishes the user. Work only lowers
 * energy, which rest restores, and mood drifts towards neutral instead of
 * running out. Events that change nothing return the same object.
 */
export function reduceNeeds(
  state: NeedsState,
  event: NeedsEvent,
  config: NeedsConfig = DEFAULT_NEEDS_CONFIG,
): NeedsState {
  switch (event.type) {
    case 'elapse':
      return elapse(state, event.now, event.activity, config);

    case 'breakCompleted':
      return event.durationMs >= config.minBreakMs
        ? { ...state, mood: clamp(state.mood + config.breakMood) }
        : state;

    case 'pet': {
      const sinceLast = state.lastPetAt === null ? Infinity : event.now - state.lastPetAt;
      if (sinceLast >= 0 && sinceLast < config.petCooldownMs) return state;
      return { ...state, mood: clamp(state.mood + config.petMood), lastPetAt: event.now };
    }

    case 'treat': {
      const left = treatsLeft(state, event.now, config);
      if (left === 0) return state;
      return {
        ...state,
        mood: clamp(state.mood + config.treatMood),
        treatDay: localDay(event.now).start,
        treatsToday: config.treatsPerDay - left + 1,
      };
    }
  }
}

/** Treats Mocha still accepts on the local day of `now`. */
export function treatsLeft(
  state: NeedsState,
  now: number,
  config: NeedsConfig = DEFAULT_NEEDS_CONFIG,
): number {
  const eaten = localDay(now).start === state.treatDay ? state.treatsToday : 0;
  return Math.max(0, config.treatsPerDay - eaten);
}

/** Whether Mocha's energy is low enough for it to look tired. */
export function isTired(state: NeedsState, config: NeedsConfig = DEFAULT_NEEDS_CONFIG): boolean {
  return state.energy < config.tiredBelow;
}
