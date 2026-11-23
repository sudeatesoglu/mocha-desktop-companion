import { NO_BROWSER_CAPABILITIES } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { needsTabs, pageContext } from './page-context.ts';

const ALL = {
  ...NO_BROWSER_CAPABILITIES,
  kind: true,
  site: true,
  title: true,
  browserActivity: true,
};
const STATS = { sound: false, tabs: 4, switchesPerMinute: 1, secondsOnPage: 30 };
const tab = (url: string, title = 'A page', incognito = false) => ({ url, title, incognito });
const context = (
  active: ReturnType<typeof tab> | undefined,
  capabilities = ALL,
  exclusions: string[] = [],
) => pageContext({ tab: active, exclusions, capabilities, browser: STATS });

describe('pageContext', () => {
  it('tells all the user allows about an ordinary page', () => {
    expect(
      context(
        tab('https://github.com/sudeatesoglu/mocha/pull/184', 'Pull 184 · call 555 123 4567'),
      ),
    ).toEqual({
      kind: 'code',
      site: 'github.com',
      title: 'Pull 184 · call',
      browser: STATS,
    });
  });

  it('tells only what is allowed', () => {
    const kindOnly = { ...NO_BROWSER_CAPABILITIES, kind: true };

    expect(context(tab('https://www.youtube.com/watch?v=1'), kindOnly)).toEqual({ kind: 'video' });
    expect(context(tab('https://www.youtube.com/'), NO_BROWSER_CAPABILITIES)).toEqual({});
  });

  it.each([
    ['no tab', undefined],
    ['a tab without an address', { incognito: false }],
    ['a private window', tab('https://github.com', 'GitHub', true)],
    ['a page that is not on the web', tab('chrome://settings')],
    ['this computer', tab('http://localhost:5173/')],
    ['a bank', tab('https://www.garantibbva.com.tr/')],
    ['a sign-in page', tab('https://github.com/login')],
  ])('tells nothing for %s', (_, active) => {
    expect(pageContext({ tab: active, exclusions: [], capabilities: ALL, browser: STATS })).toEqual(
      {},
    );
  });

  it('tells nothing about a site the user left out', () => {
    expect(context(tab('https://old.reddit.com/r/all'), ALL, ['reddit.com'])).toEqual({});
  });

  it('passes on page activity only when allowed', () => {
    const page = { keys: 4, scrolls: 2, clicks: 1, windowSeconds: 30 };
    const pagesOnly = { ...NO_BROWSER_CAPABILITIES, pageActivity: true };
    const active = tab('https://github.com/');

    expect(
      pageContext({ tab: active, exclusions: [], capabilities: pagesOnly, browser: STATS, page }),
    ).toEqual({ page });
    expect(
      pageContext({ tab: active, exclusions: [], capabilities: ALL, browser: STATS, page }),
    ).not.toHaveProperty('page');
    expect(
      pageContext({
        tab: tab('https://github.com/login'),
        exclusions: [],
        capabilities: pagesOnly,
        browser: STATS,
        page,
      }),
    ).toEqual({});
  });

  it('leaves out the titles of AI chats and titles that scrub to nothing', () => {
    expect(context(tab('https://claude.ai/chat/1', 'My private question'))).not.toHaveProperty(
      'title',
    );
    expect(context(tab('https://example.org/', '1234567'))).not.toHaveProperty('title');
  });
});

describe('needsTabs', () => {
  it('is true only for what needs to see the tab in front', () => {
    expect(needsTabs({ ...NO_BROWSER_CAPABILITIES, title: true })).toBe(true);
    expect(needsTabs({ ...NO_BROWSER_CAPABILITIES, talk: true, nudge: true })).toBe(false);
  });
});
