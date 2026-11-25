import { describe, expect, it } from 'vitest';
import { cleanAnswer } from './answer.ts';

describe('cleanAnswer', () => {
  it('shows plain text: no HTML, markdown or links', () => {
    expect(
      cleanAnswer('# Hi\n**Bold** _and_ `code` <script>x</script>[see](https://x.y)\n- one', {
        maxChars: 200,
      }),
    ).toBe('Hi\nBold and code xsee\none');
  });

  it('drops quotes around the whole answer', () => {
    expect(cleanAnswer('"Popcorn time?"', { maxChars: 50 })).toBe('Popcorn time?');
    expect(cleanAnswer('“Caw.”', { maxChars: 50 })).toBe('Caw.');
  });

  it('makes one line for a bubble, or keeps short paragraphs', () => {
    expect(cleanAnswer('One.\n\n\n\nTwo.', { maxChars: 50 })).toBe('One.\n\nTwo.');
    expect(cleanAnswer('One.\n\nTwo.', { maxChars: 50, singleLine: true })).toBe('One. Two.');
  });

  it('cuts at a word, or mid-word when the words are too long', () => {
    expect(cleanAnswer('Ravens are clever birds indeed', { maxChars: 20 })).toBe(
      'Ravens are clever…',
    );
    expect(cleanAnswer('Supercalifragilistic', { maxChars: 10 })).toBe('Supercali…');
  });

  it('keeps only the first emoji, whole', () => {
    expect(cleanAnswer('Busy day! 🚀 Take a break? 💤 Rust 🦀🧠', { maxChars: 100 })).toBe(
      'Busy day! 🚀 Take a break? Rust',
    );
    expect(cleanAnswer('Coding 👩‍💻 again ❤️', { maxChars: 100 })).toBe('Coding 👩‍💻 again');
  });
});
