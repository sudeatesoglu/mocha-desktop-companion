import { describe, expect, it } from 'vitest';
import {
  PAGE_PERMISSIONS,
  PAGE_SCRIPT,
  pageActivityMessageSchema,
  parseSavedCounts,
} from './page-script.ts';

describe('the page-activity script', () => {
  it('runs on https pages only, never where Mocha listens', () => {
    expect(PAGE_SCRIPT.matches).toEqual(['https://*/*']);
    expect(PAGE_PERMISSIONS.origins).toEqual(['https://*/*']);
    expect(PAGE_SCRIPT.allFrames).toBe(false);
  });

  it('does not even run on the listed sensitive sites', () => {
    expect(PAGE_SCRIPT.excludeMatches).toContain('https://*.paypal.com/*');
    expect(PAGE_SCRIPT.excludeMatches).toContain('https://*.web.whatsapp.com/*');
    expect(new Set(PAGE_SCRIPT.excludeMatches).size).toBe(PAGE_SCRIPT.excludeMatches.length);
  });

  it('accepts only counts within bounds', () => {
    const counts = { keys: 3, scrolls: 2, clicks: 1, windowSeconds: 30 };

    expect(pageActivityMessageSchema.safeParse({ type: 'page-activity', counts }).success).toBe(
      true,
    );
    for (const message of [
      { type: 'page-activity', counts: { ...counts, keys: -1 } },
      { type: 'page-activity', counts: { ...counts, key: 'a' } },
      { type: 'page-activity', counts, url: 'https://example.com' },
      { type: 'other', counts },
    ]) {
      expect(pageActivityMessageSchema.safeParse(message).success).toBe(false);
    }
  });

  it('reads back only well-formed saved counts', () => {
    const saved = {
      tabId: 7,
      at: 1_000,
      counts: { keys: 1, scrolls: 0, clicks: 0, windowSeconds: 30 },
    };

    expect(parseSavedCounts(saved)).toEqual(saved);
    expect(parseSavedCounts(undefined)).toBeUndefined();
    expect(parseSavedCounts({ ...saved, tabId: 'seven' })).toBeUndefined();
  });
});
