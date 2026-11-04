import type { LoopScheduler } from '@mocha/core';

/** Adapts the browser's clock and timers to the game loop's scheduler interface. */
export function createBrowserScheduler(): LoopScheduler {
  return {
    now: () => performance.now(),
    after: (ms, callback) => {
      const id = setTimeout(callback, ms);
      return () => clearTimeout(id);
    },
    nextFrame: (callback) => {
      const id = requestAnimationFrame(() => callback());
      return () => cancelAnimationFrame(id);
    },
  };
}
