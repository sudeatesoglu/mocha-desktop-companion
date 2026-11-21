import { describe, expect, it, vi } from 'vitest';
import { createBrowsingAwareness } from './browsing-awareness.ts';

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
});
