import type { BrowsingContext } from '@mocha/core';

/**
 * What Mocha knows about the user's browsing: only the latest context, in
 * memory (ADR-0012). It is forgotten when it gets old, when Mocha pauses
 * and when the computer sleeps or locks; nothing is stored or logged.
 */
export function createBrowsingAwareness(options: {
  staleMs: number;
  now: () => number;
  /** Runs `run` after `ms`; returns a function that cancels it. */
  schedule: (ms: number, run: () => void) => () => void;
}) {
  let latest: { context: BrowsingContext; at: number } | undefined;
  let cancelStale = () => {};
  const listeners = new Set<(context: BrowsingContext | undefined) => void>();
  const notify = () => {
    for (const listener of listeners) listener(latest?.context);
  };

  function forget(): void {
    cancelStale();
    if (!latest) return;
    latest = undefined;
    notify();
  }

  return {
    /** The latest context, unless it is older than `staleMs`. */
    get current(): BrowsingContext | undefined {
      if (latest && options.now() - latest.at >= options.staleMs) latest = undefined;
      return latest?.context;
    },
    report(context: BrowsingContext): void {
      latest = { context, at: options.now() };
      // When the extension goes quiet (the browser quit, the computer
      // slept), listeners hear that the context is gone.
      cancelStale();
      cancelStale = options.schedule(options.staleMs, forget);
      notify();
    },
    forget,
    /** Calls `listener` with every new context, or undefined when forgotten. */
    onChange(listener: (context: BrowsingContext | undefined) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type BrowsingAwareness = ReturnType<typeof createBrowsingAwareness>;
