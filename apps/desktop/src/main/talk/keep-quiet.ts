import type { BreakState } from '@mocha/core';

/**
 * Whether Mocha keeps quiet about what the user does in the browser: while
 * paused, outside plain work (a break due or under way, a focus session),
 * during a ritual, while another bubble shows, in the quiet hours, and while
 * hushed.
 */
export function keepQuiet(state: {
  now: number;
  paused: boolean;
  phase: BreakState['phase'];
  ritual: boolean;
  bubble: boolean;
  quietHours: boolean;
  hushedUntil: number | undefined;
}): boolean {
  return (
    state.paused ||
    state.phase !== 'working' ||
    state.ritual ||
    state.bubble ||
    state.quietHours ||
    (state.hushedUntil !== undefined && state.now < state.hushedUntil)
  );
}
