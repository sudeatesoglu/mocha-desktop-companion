import { describe, expect, it } from 'vitest';
import {
  allowedContext,
  BROWSER_CAPABILITIES,
  type BrowsingContext,
  browsingContextSchema,
  NO_BROWSER_CAPABILITIES,
} from './context.ts';

const FULL: BrowsingContext = {
  kind: 'video',
  site: 'youtube.com',
  title: 'Lofi beats to study to - call 0532 123 45 67',
  browser: { sound: true, tabs: 12, switchesPerMinute: 3, secondsOnPage: 600 },
  page: { keys: 0, scrolls: 4, clicks: 1, windowSeconds: 30 },
};
const ALL = Object.fromEntries(BROWSER_CAPABILITIES.map((name) => [name, true])) as Record<
  (typeof BROWSER_CAPABILITIES)[number],
  boolean
>;

describe('browsingContextSchema', () => {
  it('accepts a full context and an empty one', () => {
    expect(browsingContextSchema.safeParse(FULL).success).toBe(true);
    expect(browsingContextSchema.safeParse({}).success).toBe(true);
  });

  it.each([
    ['an unknown kind', { kind: 'banking' }],
    ['a site with a path', { site: 'example.com/inbox' }],
    ['a site with a query', { site: 'example.com?u=me' }],
    ['a site in capitals', { site: 'Example.com' }],
    ['a long title', { title: 'x'.repeat(201) }],
    ['a negative count', { page: { keys: -1, scrolls: 0, clicks: 0, windowSeconds: 30 } }],
    ['a fraction of a key', { page: { keys: 1.5, scrolls: 0, clicks: 0, windowSeconds: 30 } }],
    ['an unknown field', { kind: 'code', url: 'https://example.com' }],
    [
      'an unknown activity field',
      { page: { keys: 1, scrolls: 0, clicks: 0, windowSeconds: 30, text: 'hi' } },
    ],
  ])('refuses %s', (_case, context) => {
    expect(browsingContextSchema.safeParse(context).success).toBe(false);
  });
});

describe('allowedContext', () => {
  it('keeps nothing while every capability is off', () => {
    expect(allowedContext(FULL, NO_BROWSER_CAPABILITIES)).toEqual({});
  });

  it('keeps each part only with its own capability', () => {
    expect(allowedContext(FULL, { ...NO_BROWSER_CAPABILITIES, kind: true })).toEqual({
      kind: 'video',
    });
    expect(allowedContext(FULL, { ...NO_BROWSER_CAPABILITIES, site: true })).toEqual({
      site: 'youtube.com',
    });
    expect(allowedContext(FULL, { ...NO_BROWSER_CAPABILITIES, browserActivity: true })).toEqual({
      browser: FULL.browser,
    });
    expect(allowedContext(FULL, { ...NO_BROWSER_CAPABILITIES, pageActivity: true })).toEqual({
      page: FULL.page,
    });
  });

  it('scrubs the title again, whatever the extension did', () => {
    expect(allowedContext(FULL, { ...NO_BROWSER_CAPABILITIES, title: true })).toEqual({
      title: 'Lofi beats to study to - call',
    });
  });

  it('drops a title that scrubbing leaves empty', () => {
    expect(allowedContext({ title: 'me@example.com' }, ALL)).toEqual({});
  });

  it('keeps everything the user allows', () => {
    expect(allowedContext(FULL, ALL)).toEqual({ ...FULL, title: 'Lofi beats to study to - call' });
  });
});
