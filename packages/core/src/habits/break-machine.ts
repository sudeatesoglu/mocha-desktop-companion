const MINUTE_MS = 60_000;

export interface BreakConfig {
  /** Work time before a break is suggested. */
  readonly workMs: number;
  /** Length of a break the user accepts. */
  readonly breakMs: number;
  /** How long a snooze delays the reminder. */
  readonly snoozeMs: number;
  /** Time without input that counts as being away, and so as a break. */
  readonly idleBreakMs: number;
}

export const DEFAULT_BREAK_CONFIG: BreakConfig = Object.freeze({
  workMs: 50 * MINUTE_MS,
  breakMs: 5 * MINUTE_MS,
  snoozeMs: 10 * MINUTE_MS,
  idleBreakMs: 5 * MINUTE_MS,
});

/** Builds a configuration from the defaults, rejecting unusable durations. */
export function breakConfig(overrides: Partial<BreakConfig> = {}): BreakConfig {
  const config = { ...DEFAULT_BREAK_CONFIG, ...overrides };
  for (const [name, value] of Object.entries(config)) {
    if (!(value > 0 && Number.isFinite(value))) {
      throw new RangeError(`${name} must be a positive finite number, got ${value}`);
    }
  }
  return config;
}

/**
 * Where the user is in the work and break cycle. Times are milliseconds on
 * the clock passed in with events. Each state carries the data its own
 * transitions need, so an impossible combination cannot be represented.
 */
export type BreakState =
  | { readonly phase: 'working'; readonly workStartedAt: number; readonly snoozedUntil: number }
  | { readonly phase: 'due'; readonly workStartedAt: number; readonly dueAt: number }
  | {
      readonly phase: 'onBreak';
      readonly startedAt: number;
      /** Earliest end; the break goes on while the user is still away. */
      readonly endsAt: number;
      /** The work stretch this break ended. */
      readonly workStartedAt: number;
    }
  | { readonly phase: 'paused' };

export type BreakEvent =
  /** Time passed. `idleMs` is how long there has been no user input. */
  | { readonly type: 'tick'; readonly now: number; readonly idleMs: number }
  | { readonly type: 'accept' | 'snooze' | 'dismiss' | 'pause' | 'resume'; readonly now: number };

/** A new work stretch beginning at `now`. */
export function startWorking(now: number): BreakState {
  return { phase: 'working', workStartedAt: now, snoozedUntil: 0 };
}

type ActiveWork = Extract<BreakState, { phase: 'working' | 'due' }>;

/** The user left: the break began when input stopped, not when we noticed. */
function awayBreak(state: ActiveWork, now: number, idleMs: number): BreakState {
  const startedAt = Math.max(now - idleMs, state.workStartedAt);
  return { phase: 'onBreak', startedAt, endsAt: startedAt, workStartedAt: state.workStartedAt };
}

/**
 * The break rules as a pure function: no timers and no clock, so every case
 * is tested without waiting. Events that do not apply in the current phase
 * return the same object, which tells callers that nothing changed.
 */
export function reduceBreak(state: BreakState, event: BreakEvent, config: BreakConfig): BreakState {
  if (state.phase === 'paused') {
    return event.type === 'resume' ? startWorking(event.now) : state;
  }
  if (event.type === 'pause') return { phase: 'paused' };

  switch (state.phase) {
    case 'working': {
      if (event.type !== 'tick') return state;
      const { now, idleMs } = event;
      if (idleMs >= config.idleBreakMs) return awayBreak(state, now, idleMs);
      const isDue = now - state.workStartedAt >= config.workMs && now >= state.snoozedUntil;
      return isDue ? { phase: 'due', workStartedAt: state.workStartedAt, dueAt: now } : state;
    }

    case 'due':
      switch (event.type) {
        case 'tick':
          return event.idleMs >= config.idleBreakMs
            ? awayBreak(state, event.now, event.idleMs)
            : state;
        case 'accept':
          return {
            phase: 'onBreak',
            startedAt: event.now,
            endsAt: event.now + config.breakMs,
            workStartedAt: state.workStartedAt,
          };
        case 'snooze':
          return {
            phase: 'working',
            workStartedAt: state.workStartedAt,
            snoozedUntil: event.now + config.snoozeMs,
          };
        case 'dismiss':
          return startWorking(event.now);
        default:
          return state;
      }

    case 'onBreak': {
      if (event.type !== 'tick') return state;
      const isOver = event.now >= state.endsAt && event.idleMs < config.idleBreakMs;
      return isOver ? startWorking(event.now) : state;
    }
  }
}
