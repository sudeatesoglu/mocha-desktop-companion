import { describe, expect, it } from 'vitest';
import {
  browserStats,
  freshActivity,
  parseActivity,
  recordNavigation,
  recordSwitch,
  SWITCH_WINDOW_MS,
} from './browser-activity.ts';

const MINUTE = 60_000;

describe('browser activity', () => {
  it('counts switches over the last five minutes, per minute', () => {
    let state = freshActivity(0);
    for (const at of [1, 2, 3, 4, 5]) state = recordSwitch(state, at * MINUTE);

    expect(browserStats(state, 5 * MINUTE, { count: 3, sound: false }).switchesPerMinute).toBe(1);
    expect(browserStats(state, 8 * MINUTE, { count: 3, sound: false }).switchesPerMinute).toBe(0.4);
  });

  it('forgets old switches as new ones come', () => {
    const state = recordSwitch(recordSwitch(freshActivity(0), 0), SWITCH_WINDOW_MS + 1);

    expect(state.switches).toEqual([SWITCH_WINDOW_MS + 1]);
  });

  it('times the page in front from a switch or a new page', () => {
    const switched = recordSwitch(freshActivity(0), 10_000);
    const navigated = recordNavigation(switched, 70_000);

    expect(browserStats(switched, 40_000, { count: 1, sound: false }).secondsOnPage).toBe(30);
    expect(browserStats(navigated, 75_500, { count: 1, sound: false }).secondsOnPage).toBe(5);
    expect(navigated.switches).toEqual([10_000]);
  });

  it('passes on the tabs and sound, and stays within the API’s bounds', () => {
    const stats = browserStats(freshActivity(1_000), 0, { count: 20_000, sound: true });

    expect(stats).toEqual({ sound: true, tabs: 10_000, switchesPerMinute: 0, secondsOnPage: 0 });
    expect(
      browserStats(freshActivity(0), 2 * 86_400_000, { count: 1, sound: false }),
    ).toMatchObject({ secondsOnPage: 86_400 });
  });

  it('reads back only a well-formed state', () => {
    const state = recordSwitch(freshActivity(0), 1_000);

    expect(parseActivity(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(parseActivity(undefined)).toBeUndefined();
    expect(parseActivity({ switches: 'many', pageSince: 0 })).toBeUndefined();
  });
});
