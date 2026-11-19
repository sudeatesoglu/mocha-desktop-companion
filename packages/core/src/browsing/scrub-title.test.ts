import { describe, expect, it } from 'vitest';
import { MAX_TITLE_LENGTH, scrubTitle } from './scrub-title.ts';

describe('scrubTitle', () => {
  it('keeps an ordinary title', () => {
    expect(scrubTitle('How to center a div - Stack Overflow')).toBe(
      'How to center a div - Stack Overflow',
    );
  });

  it.each([
    ['an email address', 'Mail from sude.atesoglu@example.com - Inbox', 'Mail from - Inbox'],
    ['a web address', 'Read https://example.com/a?b=c later', 'Read later'],
    ['a phone number', 'Call +90 (532) 123 45 67 today', 'Call today'],
    ['a card number', 'Card 4111 1111 1111 1111 saved', 'Card saved'],
    ['an order number', 'Order 1234567 shipped', 'Order shipped'],
    ['an IBAN', 'Pay to TR33 0006 1005 1978 6457 8413 26', 'Pay to'],
    ['a token', 'Reset link abcDEF1234567890xyz expired', 'Reset link expired'],
  ])('removes %s', (_case, title, expected) => {
    expect(scrubTitle(title)).toBe(expected);
  });

  it('keeps short numbers, such as a year or a version', () => {
    expect(scrubTitle('Electron 44 release notes 2026')).toBe('Electron 44 release notes 2026');
  });

  it('drops separators left dangling at the ends', () => {
    expect(scrubTitle('ali@example.com | Inbox')).toBe('Inbox');
  });

  it('shortens a long title with an ellipsis', () => {
    const scrubbed = scrubTitle('word '.repeat(40));

    expect(scrubbed).toHaveLength(MAX_TITLE_LENGTH);
    expect(scrubbed.endsWith('…')).toBe(true);
  });

  it('can leave nothing at all', () => {
    expect(scrubTitle('  me@example.com  ')).toBe('');
  });
});
