import type { BrowsingContext } from '@mocha/core';

/** The chat may look back this far (ADR-0013). */
export const RECENT_MS = 30 * 60_000;
export const MAX_RECENT = 40;

/** A page the user was on lately, with only what Mocha may know of it. */
export interface Visit {
  readonly since: number;
  until: number;
  readonly kind?: BrowsingContext['kind'];
  readonly site?: string;
  readonly title?: string;
}

/**
 * What Mocha knows about the user's browsing, in memory only (ADR-0012,
 * ADR-0013): the latest context, and the pages of the last half hour for
 * the chat. The latest goes when it gets old; both go when Mocha pauses
 * and when the computer sleeps or locks. Nothing is stored or logged.
 */
export function createBrowsingAwareness(options: {
  staleMs: number;
  now: () => number;
  /** Runs `run` after `ms`; returns a function that cancels it. */
  schedule: (ms: number, run: () => void) => () => void;
}) {
  let latest: { context: BrowsingContext; at: number } | undefined;
  let recent: Visit[] = [];
  let cancelStale = () => {};
  const listeners = new Set<(context: BrowsingContext | undefined) => void>();
  const notify = () => {
    for (const listener of listeners) listener(latest?.context);
  };

  // The browser went quiet: the page in front is gone, the half hour stays.
  function stale(): void {
    if (!latest) return;
    latest = undefined;
    notify();
  }

  function forget(): void {
    cancelStale();
    recent = [];
    stale();
  }

  function remember(context: BrowsingContext, now: number): void {
    const { kind, site, title } = context;
    if (kind || site || title) {
      const last = recent.at(-1);
      if (last && last.kind === kind && last.site === site && last.title === title) {
        last.until = now;
      } else {
        recent.push({
          since: now,
          until: now,
          ...(kind && { kind }),
          ...(site && { site }),
          ...(title && { title }),
        });
      }
    }
    recent = recent.filter(({ until }) => now - until < RECENT_MS).slice(-MAX_RECENT);
  }

  return {
    /** The latest context, unless it is older than `staleMs`. */
    get current(): BrowsingContext | undefined {
      if (latest && options.now() - latest.at >= options.staleMs) latest = undefined;
      return latest?.context;
    },
    report(context: BrowsingContext): void {
      const now = options.now();
      latest = { context, at: now };
      remember(context, now);
      // When the extension goes quiet (the browser quit, the computer
      // slept), listeners hear that the context is gone.
      cancelStale();
      cancelStale = options.schedule(options.staleMs, stale);
      notify();
    },
    forget,
    /** The pages of the last half hour, newest first. */
    recent(): readonly Visit[] {
      const now = options.now();
      return recent.filter(({ until }) => now - until < RECENT_MS).reverse();
    },
    /** Calls `listener` with every new context, or undefined when forgotten. */
    onChange(listener: (context: BrowsingContext | undefined) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type BrowsingAwareness = ReturnType<typeof createBrowsingAwareness>;
