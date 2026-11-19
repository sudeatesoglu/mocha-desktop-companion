import type { BrowsingContext } from '@mocha/core';

/**
 * What Mocha knows about the user's browsing: only the latest context, in
 * memory (ADR-0012). It is forgotten when it gets old, when Mocha pauses
 * and when the computer sleeps or locks; nothing is stored or logged.
 */
export function createBrowsingAwareness(options: { staleMs: number; now: () => number }) {
  let latest: { context: BrowsingContext; at: number } | undefined;
  const listeners = new Set<(context: BrowsingContext | undefined) => void>();
  const notify = () => {
    for (const listener of listeners) listener(latest?.context);
  };

  return {
    /** The latest context, unless it is older than `staleMs`. */
    get current(): BrowsingContext | undefined {
      if (latest && options.now() - latest.at >= options.staleMs) latest = undefined;
      return latest?.context;
    },
    report(context: BrowsingContext): void {
      latest = { context, at: options.now() };
      notify();
    },
    forget(): void {
      if (!latest) return;
      latest = undefined;
      notify();
    },
    /** Calls `listener` with every new context, or undefined when forgotten. */
    onChange(listener: (context: BrowsingContext | undefined) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type BrowsingAwareness = ReturnType<typeof createBrowsingAwareness>;
