import { describe, expect, it } from 'vitest';
import { parseExclusion, withExclusion } from './exclusions.ts';
import { MAX_EXCLUSIONS } from './settings.ts';

describe('parseExclusion', () => {
  it.each([
    ['reddit.com', 'reddit.com'],
    ['  Reddit.COM ', 'reddit.com'],
    ['https://www.reddit.com/r/all?sort=new', 'reddit.com'],
    ['old.reddit.com', 'old.reddit.com'],
    ['https://me:secret@news.example.org:8080/a', 'news.example.org'],
    ['example.com.', 'example.com'],
  ])('reads %s as %s', (input, expected) => {
    expect(parseExclusion(input)).toBe(expected);
  });

  it.each(['', 'reddit', 'not a site', 'chrome://settings', 'https://', 'exa_mple.com'])(
    'refuses %j',
    (input) => {
      expect(parseExclusion(input)).toBeUndefined();
    },
  );
});

describe('withExclusion', () => {
  it('adds a site in order, once', () => {
    expect(withExclusion(['youtube.com'], 'reddit.com')).toEqual(['reddit.com', 'youtube.com']);
    expect(withExclusion(['reddit.com'], 'reddit.com')).toEqual(['reddit.com']);
  });

  it('adds nothing to a full list', () => {
    const full = Array.from({ length: MAX_EXCLUSIONS }, (_, i) => `site${i}.com`);

    expect(withExclusion(full, 'reddit.com')).toBeUndefined();
  });
});
