import { z } from 'zod';

/** Tab switches older than this no longer count. */
export const SWITCH_WINDOW_MS = 5 * 60_000;

/**
 * What the extension remembers to describe browser activity (capability 6):
 * when the user switched tabs lately and since when the page in front has
 * been there. No address, title or tab is part of it.
 */
export interface ActivityState {
  readonly switches: readonly number[];
  readonly pageSince: number;
}

const activitySchema = z.strictObject({
  switches: z.array(z.number()).max(1_000),
  pageSince: z.number(),
});

/** The state as kept in Chrome's session storage, or undefined if unreadable. */
export function parseActivity(value: unknown): ActivityState | undefined {
  const parsed = activitySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function freshActivity(now: number): ActivityState {
  return { switches: [], pageSince: now };
}

/** Another tab came to the front. */
export function recordSwitch(state: ActivityState, now: number): ActivityState {
  return {
    switches: [...state.switches.filter((at) => now - at < SWITCH_WINDOW_MS), now],
    pageSince: now,
  };
}

/** The tab in front went to another page. */
export function recordNavigation(state: ActivityState, now: number): ActivityState {
  return { ...state, pageSince: now };
}

export interface BrowserStats {
  sound: boolean;
  tabs: number;
  switchesPerMinute: number;
  secondsOnPage: number;
}

/** Browser activity as Mocha's API takes it, within its bounds. */
export function browserStats(
  state: ActivityState,
  now: number,
  tabs: { count: number; sound: boolean },
): BrowserStats {
  const recent = state.switches.filter((at) => now - at < SWITCH_WINDOW_MS).length;
  return {
    sound: tabs.sound,
    tabs: Math.min(tabs.count, 10_000),
    switchesPerMinute: Math.min(
      Math.round((recent / (SWITCH_WINDOW_MS / 60_000)) * 10) / 10,
      1_000,
    ),
    secondsOnPage: Math.min(Math.max(0, Math.floor((now - state.pageSince) / 1_000)), 86_400),
  };
}
