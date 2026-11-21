import type { ReminderSide } from './reminder.ts';

/** Size of the comment bubble window in screen pixels. */
export const COMMENT_WIDTH = 240;
export const COMMENT_HEIGHT = 84;

/** How long a comment shows, fading in and out, before it closes. */
export const COMMENT_SHOW_MS = 7_000;

/** Main → comment: what Mocha says and which side of Mocha the bubble sits on. */
export interface CommentShow {
  /** Plain text, never HTML: it can hold a page title (ADR-0011). */
  text: string;
  side: ReminderSide;
}
