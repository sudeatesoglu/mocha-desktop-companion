/** Counts go to the extension's worker once per window. */
export const WINDOW_SECONDS = 30;
/** One scroll gesture fires many events: they count once per this long. */
export const SCROLL_GAP_MS = 250;

/** What a page's activity becomes: counts over a window, never single events. */
export interface PageCounts {
  keys: number;
  scrolls: number;
  clicks: number;
  windowSeconds: number;
}

/**
 * Whether typing in this field must not even be counted: a count could
 * reveal a password's length (ADR-0012). It reads only the field's type and
 * its autocomplete hint, never its value.
 */
export function isSecretField(field: { tagName: string; type?: string; autocomplete?: string }) {
  if (field.tagName !== 'INPUT') return false;
  if (field.type === 'password') return true;
  return /password|one-time-code|cc-/.test(field.autocomplete ?? '');
}

/**
 * Counts typing, scrolling and clicking on a page. It is told only that
 * something happened, never which key, where or on what.
 */
export function createActivityCounter(now: () => number) {
  let keys = 0;
  let scrolls = 0;
  let clicks = 0;
  let lastScroll = Number.NEGATIVE_INFINITY;
  let since = now();

  return {
    key(press: { repeat: boolean; secret: boolean }): void {
      if (!press.repeat && !press.secret) keys += 1;
    },
    scroll(): void {
      const at = now();
      if (at - lastScroll < SCROLL_GAP_MS) return;
      scrolls += 1;
      lastScroll = at;
    },
    click(): void {
      clicks += 1;
    },
    /** The counts since the last take, then it starts over. */
    take(): PageCounts {
      const at = now();
      const counts = {
        keys: Math.min(keys, 100_000),
        scrolls: Math.min(scrolls, 100_000),
        clicks: Math.min(clicks, 100_000),
        windowSeconds: Math.min(Math.max(Math.round((at - since) / 1_000), 1), 600),
      };
      keys = 0;
      scrolls = 0;
      clicks = 0;
      since = at;
      return counts;
    },
  };
}
