import {
  type BreakConfig,
  type BreakEvent,
  type BreakState,
  reduceBreak,
  startWorking,
} from '@mocha/core';

export interface BreakController {
  readonly state: BreakState;
  dispatch(event: BreakEvent): void;
  /** Calls `listener` with the old and new state on every change. Returns an unsubscribe function. */
  onChange(listener: (next: BreakState, previous: BreakState) => void): () => void;
}

/**
 * Holds the current break state in the main process and applies the pure
 * rules from @mocha/core. Parts that react to breaks (the reminder window,
 * the history) subscribe instead of being called one by one.
 */
export function createBreakController(config: BreakConfig, now: number): BreakController {
  let state = startWorking(now);
  const listeners = new Set<(next: BreakState, previous: BreakState) => void>();

  return {
    get state() {
      return state;
    },
    dispatch(event) {
      const next = reduceBreak(state, event, config);
      if (next === state) return;
      const previous = state;
      state = next;
      for (const listener of listeners) listener(next, previous);
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
