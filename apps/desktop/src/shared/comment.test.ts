import { COMMENT_LINES, NUDGE_LINES } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { COMMENT_SHOW_MS } from './comment.ts';

describe('the comment bubble', () => {
  it('shows long enough to read its longest line, at about four words a second', () => {
    // A title fills in with up to 32 characters: say six words.
    const words = (line: string) =>
      line.replace('{title}', 'one two three four five six').split(/\s+/).length;
    const longest = Math.max(
      ...[...Object.values(COMMENT_LINES), ...Object.values(NUDGE_LINES)].flat().map(words),
    );

    // Most of the time on screen is fully visible; a second goes to fading.
    expect(COMMENT_SHOW_MS - 1_000).toBeGreaterThanOrEqual((longest / 4) * 1_000);
  });
});
