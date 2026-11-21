import type { BrowsingContext } from './context.ts';

/** How Mocha keeps the user company in the browser, by what they do there. */
export const BROWSING_POSES = ['readAlong', 'watch', 'bob', 'shiny', 'scribble'] as const;
export type BrowsingPose = (typeof BROWSING_POSES)[number];

/** Typing at least this fast, on average over a window, is typing a lot. */
export const BUSY_TYPING_KEYS_PER_SECOND = 1;

/**
 * Mocha's pose for what the user does in the browser, or null for its usual
 * idle. Poses follow the kind of site, so there is none unless the user lets
 * Mocha know it (ADR-0012); typing a lot comes first, and music only when
 * something plays, if Mocha may know that.
 */
export function browsingPose(context: BrowsingContext | undefined): BrowsingPose | null {
  if (!context?.kind) return null;
  const { page, browser } = context;
  if (page && page.keys / page.windowSeconds >= BUSY_TYPING_KEYS_PER_SECOND) return 'scribble';
  switch (context.kind) {
    case 'code':
    case 'docs':
    case 'reading':
      return 'readAlong';
    case 'video':
      return 'watch';
    case 'music':
      return browser?.sound === false ? null : 'bob';
    case 'shopping':
      return 'shiny';
    default:
      return null;
  }
}
