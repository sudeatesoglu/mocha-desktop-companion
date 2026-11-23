import { describe, expect, it } from 'vitest';
import {
  COMMENT_LINES,
  MAX_TITLE_IN_LINE,
  NUDGE_LINES,
  pickLine,
  writeLine,
} from './talk-lines.ts';

const ALL_LISTS = [...Object.values(COMMENT_LINES), ...Object.values(NUDGE_LINES)];

describe('the lines', () => {
  it('always have a line that needs nothing filled in, and no line twice', () => {
    for (const lines of ALL_LISTS) {
      expect(lines.filter((line) => !line.includes('{')).length).toBeGreaterThanOrEqual(2);
      expect(new Set(lines).size).toBe(lines.length);
    }
  });

  it('know only the site and the title as blanks', () => {
    for (const line of ALL_LISTS.flat()) {
      expect(line.replace('{site}', '').replace('{title}', '')).not.toMatch(/[{}]/);
    }
  });

  it('nudge without blanks, so they never say what the user is on', () => {
    for (const line of Object.values(NUDGE_LINES).flat()) expect(line).not.toContain('{');
  });
});

describe('writeLine', () => {
  it('fills in the site and the title', () => {
    expect(writeLine('{site}? Ship it.', { site: 'github.com' })).toBe('github.com? Ship it.');
    expect(writeLine('“{title}”? Scoot over.', { title: 'Raven facts' })).toBe(
      '“Raven facts”? Scoot over.',
    );
  });

  it('skips a line that needs what Mocha may not know', () => {
    expect(writeLine('{site}? Ship it.', { kind: 'code' })).toBeUndefined();
    expect(writeLine('“{title}”? Scoot over.', { site: 'youtube.com' })).toBeUndefined();
    expect(writeLine('Popcorn’s ready.', {})).toBe('Popcorn’s ready.');
  });

  it('shortens long titles to fit the bubble', () => {
    const title = 'A very long title about the private lives of ravens in winter';
    const written = writeLine('“{title}”', { title }) as string;

    expect(written.length).toBeLessThanOrEqual(MAX_TITLE_IN_LINE + 2);
    expect(written.endsWith('…”')).toBe(true);
  });
});

describe('pickLine', () => {
  const lines = ['One.', 'Two.', '{site}!'];

  it('picks at random among the lines it can write', () => {
    expect(pickLine(lines, {}, [], () => 0)).toBe('One.');
    expect(pickLine(lines, {}, [], () => 0.99)).toBe('Two.');
    expect(pickLine(lines, { site: 'x.com' }, [], () => 0.99)).toBe('x.com!');
  });

  it('does not repeat a recent line while there is another', () => {
    expect(pickLine(lines, {}, ['One.'], () => 0)).toBe('Two.');
    expect(pickLine(lines, {}, ['One.', 'Two.'], () => 0)).toBe('One.');
  });
});
