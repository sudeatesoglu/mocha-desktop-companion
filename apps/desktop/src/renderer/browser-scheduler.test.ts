import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserScheduler } from './browser-scheduler.ts';

describe('createBrowserScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Tests run in Node, which has no animation frames; emulate one per 16 ms.
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), 16),
    );
    vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reads the monotonic clock', () => {
    const scheduler = createBrowserScheduler();
    const start = scheduler.now();

    vi.advanceTimersByTime(500);

    expect(scheduler.now() - start).toBe(500);
  });

  it('runs a callback after the delay, unless cancelled', () => {
    const scheduler = createBrowserScheduler();
    const kept = vi.fn();
    const dropped = vi.fn();

    scheduler.after(100, kept);
    scheduler.after(100, dropped)();
    vi.advanceTimersByTime(100);

    expect(kept).toHaveBeenCalledOnce();
    expect(dropped).not.toHaveBeenCalled();
  });

  it('runs a callback on the next frame, unless cancelled', () => {
    const scheduler = createBrowserScheduler();
    const kept = vi.fn();
    const dropped = vi.fn();

    scheduler.nextFrame(kept);
    scheduler.nextFrame(dropped)();
    vi.advanceTimersByTime(16);

    expect(kept).toHaveBeenCalledOnce();
    expect(dropped).not.toHaveBeenCalled();
  });
});
