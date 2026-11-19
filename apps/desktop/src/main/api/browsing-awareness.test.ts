import { describe, expect, it, vi } from 'vitest';
import { createBrowsingAwareness } from './browsing-awareness.ts';

describe('createBrowsingAwareness', () => {
  it('knows only the latest context', () => {
    const awareness = createBrowsingAwareness({ staleMs: 60_000, now: () => 0 });

    awareness.report({ kind: 'code' });
    awareness.report({ kind: 'video' });

    expect(awareness.current).toEqual({ kind: 'video' });
  });

  it('forgets a context that got old', () => {
    let now = 0;
    const awareness = createBrowsingAwareness({ staleMs: 60_000, now: () => now });
    awareness.report({ kind: 'music' });

    now = 59_999;
    expect(awareness.current).toEqual({ kind: 'music' });
    now = 60_000;
    expect(awareness.current).toBeUndefined();
  });

  it('forgets on request and tells listeners', () => {
    const awareness = createBrowsingAwareness({ staleMs: 60_000, now: () => 0 });
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
});
