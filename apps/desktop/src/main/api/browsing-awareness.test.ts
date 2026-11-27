import { describe, expect, it, vi } from 'vitest';
import { createBrowsingAwareness, MAX_RECENT, RECENT_MS, samePage } from './browsing-awareness.ts';

describe('createBrowsingAwareness', () => {
  it('knows only the latest context', () => {
    const awareness = createBrowsingAwareness({
      staleMs: 60_000,
      now: () => 0,
      schedule: () => () => {},
    });

    awareness.report({ kind: 'code' });
    awareness.report({ kind: 'video' });

    expect(awareness.current).toEqual({ kind: 'video' });
  });

  it('forgets a context that got old', () => {
    let now = 0;
    const awareness = createBrowsingAwareness({
      staleMs: 60_000,
      now: () => now,
      schedule: () => () => {},
    });
    awareness.report({ kind: 'music' });

    now = 59_999;
    expect(awareness.current).toEqual({ kind: 'music' });
    now = 60_000;
    expect(awareness.current).toBeUndefined();
  });

  it('forgets on request and tells listeners', () => {
    const awareness = createBrowsingAwareness({
      staleMs: 60_000,
      now: () => 0,
      schedule: () => () => {},
    });
    const listener = vi.fn();
    const stop = awareness.onChange(listener);

    awareness.report({ kind: 'social' });
    awareness.forget();
    awareness.forget(); // nothing left: no second call
    stop();
    awareness.report({ kind: 'chat' });

    expect(listener.mock.calls).toEqual([[{ kind: 'social' }], [undefined]]);
    expect(awareness.current).toEqual({ kind: 'chat' });
  });

  it('tells listeners when the latest context gets old, and only the latest', () => {
    const timers: { ms: number; run: () => void; cancelled: boolean }[] = [];
    const awareness = createBrowsingAwareness({
      staleMs: 60_000,
      now: () => 0,
      schedule: (ms, run) => {
        const timer = { ms, run, cancelled: false };
        timers.push(timer);
        return () => {
          timer.cancelled = true;
        };
      },
    });
    const listener = vi.fn();
    awareness.onChange(listener);

    awareness.report({ kind: 'video' });
    awareness.report({ kind: 'music' });
    expect(timers.map(({ ms, cancelled }) => [ms, cancelled])).toEqual([
      [60_000, true],
      [60_000, false],
    ]);

    timers[1]?.run();
    expect(listener).toHaveBeenLastCalledWith(undefined);
    expect(awareness.current).toBeUndefined();

    awareness.report({ kind: 'code' });
    awareness.forget();
    expect(timers[2]?.cancelled).toBe(true);
  });

  describe('the last half hour', () => {
    const MINUTE = 60_000;
    function setup() {
      let now = 0;
      const timers: (() => void)[] = [];
      const awareness = createBrowsingAwareness({
        staleMs: 3 * MINUTE,
        now: () => now,
        schedule: (_ms, run) => {
          timers.push(run);
          return () => {};
        },
      });
      const at = (ms: number) => {
        now = ms;
      };
      awareness.keepRecent(true);
      return { awareness, timers, at };
    }

    it('keeps the pages, newest first, once each while the user stays', () => {
      const { awareness, at } = setup();
      awareness.report({ kind: 'code', site: 'github.com', title: 'PR' });
      at(MINUTE);
      awareness.report({ kind: 'code', site: 'github.com', title: 'PR' });
      at(2 * MINUTE);
      awareness.report({ kind: 'video', site: 'youtube.com' });
      awareness.report({});

      expect(awareness.recent()).toEqual([
        { since: 2 * MINUTE, until: 2 * MINUTE, kind: 'video', site: 'youtube.com' },
        { since: 0, until: MINUTE, kind: 'code', site: 'github.com', title: 'PR' },
      ]);
    });

    it('keeps nothing unless the chat may see the browsing, and forgets when that stops', () => {
      const { awareness } = setup();
      awareness.report({ kind: 'code' });
      awareness.keepRecent(false);
      awareness.report({ kind: 'video' });

      expect(awareness.recent()).toEqual([]);
      expect(awareness.current).toEqual({ kind: 'video' });
    });

    it('keeps only the browsing details, never activity', () => {
      const { awareness } = setup();
      awareness.report({
        kind: 'code',
        browser: { sound: false, tabs: 3, switchesPerMinute: 1, secondsOnPage: 9 },
        page: { keys: 1, scrolls: 1, clicks: 1, windowSeconds: 30 },
      });

      expect(awareness.recent()).toEqual([{ since: 0, until: 0, kind: 'code' }]);
    });

    it('lets pages older than half an hour go, and keeps at most a few dozen', () => {
      const { awareness, at } = setup();
      for (let i = 0; i < MAX_RECENT + 5; i++) {
        at(i * 1_000);
        awareness.report({ site: `site${i}.com` });
      }
      expect(awareness.recent()).toHaveLength(MAX_RECENT);

      at(44_000 + RECENT_MS);
      expect(awareness.recent()).toEqual([]);
    });

    it('keeps the half hour when the browser goes quiet, but not after a pause or sleep', () => {
      const { awareness, timers } = setup();
      awareness.report({ kind: 'music' });
      timers.at(-1)?.();

      expect(awareness.current).toBeUndefined();
      expect(awareness.recent()).toHaveLength(1);
      awareness.forget();
      expect(awareness.recent()).toEqual([]);
    });
  });

  describe('what the page is about', () => {
    const GIST = { topic: 'Rust lifetimes', gist: 'A chapter on lifetimes.' };
    const PAGE = { kind: 'docs', site: 'doc.rust-lang.org', title: 'Lifetimes' } as const;

    function setup() {
      let now = 0;
      const awareness = createBrowsingAwareness({
        staleMs: 3 * 60_000,
        now: () => now,
        schedule: () => () => {},
      });
      awareness.keepRecent(true);
      return {
        awareness,
        at: (ms: number) => {
          now = ms;
        },
      };
    }

    it('keeps the gist with the page while the user stays, and in the half hour', () => {
      const { awareness } = setup();
      awareness.report(PAGE);
      awareness.describe({ ...PAGE }, GIST);
      awareness.report({ ...PAGE });

      expect(awareness.about).toEqual(GIST);
      expect(awareness.recent()[0]?.about).toBe(GIST.gist);
      awareness.report({ kind: 'video', site: 'youtube.com' });
      expect(awareness.about).toBeUndefined();
      expect(awareness.recent()[1]?.about).toBe(GIST.gist);
    });

    it('drops a gist for a page the user already left', () => {
      const { awareness } = setup();
      awareness.report(PAGE);
      awareness.report({ kind: 'video' });
      awareness.describe(PAGE, GIST);

      expect(awareness.about).toBeUndefined();
      expect(awareness.recent().every((visit) => visit.about === undefined)).toBe(true);
    });

    it('keeps the gist out of the half hour when the visit is not the page', () => {
      const { awareness } = setup();
      awareness.keepRecent(false);
      awareness.report(PAGE);
      awareness.describe(PAGE, GIST);

      expect(awareness.about).toEqual(GIST);
      expect(awareness.recent()).toEqual([]);
    });

    it('knows nothing before a page, and lets an old gist go', () => {
      const { awareness, at } = setup();
      awareness.describe(PAGE, GIST);
      expect(awareness.about).toBeUndefined();

      awareness.report(PAGE);
      awareness.describe(PAGE, GIST);
      at(3 * 60_000);
      expect(awareness.about).toBeUndefined();
    });
  });

  it('tells pages apart by what Mocha may know of them', () => {
    expect(samePage({ kind: 'code', site: 'a.com' }, { kind: 'code', site: 'a.com' })).toBe(true);
    expect(samePage({ kind: 'code', title: 'A' }, { kind: 'code', title: 'B' })).toBe(false);
  });
});
