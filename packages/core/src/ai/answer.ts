// One emoji, with its variation selectors and joined parts (👩‍💻).
const EMOJI = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\uFE0F?/gu;

/** `text` with only its first emoji: Mocha's persona allows one at most. */
function oneEmoji(text: string): string {
  let kept = false;
  return text.replace(EMOJI, (emoji) => {
    if (kept) return '';
    kept = true;
    return emoji;
  });
}

/**
 * A model's answer as Mocha may show it: plain text, never HTML or
 * markdown (ADR-0013), one emoji at most, without wrapping quotes, and at
 * most `maxChars` long, cut at a word. `singleLine` makes it one line, for
 * a bubble.
 */
export function cleanAnswer(
  text: string,
  { maxChars, singleLine = false }: { maxChars: number; singleLine?: boolean },
): string {
  let clean = oneEmoji(text)
    .replace(/<[^>]*>/g, '') // HTML tags
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](link) → text
    .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+\.)\s+/gm, '') // headings and list marks
    .replace(/(\*\*|__|\*|_|`)/g, '') // emphasis and code marks
    .replace(/\r/g, '');
  clean = singleLine
    ? clean.replace(/\s+/g, ' ')
    : clean.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  clean = clean
    .trim()
    .replace(/^["“'](.*)["”']$/s, '$1')
    .trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > maxChars / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
