/**
 * A model's answer as Mocha may show it: plain text, never HTML or
 * markdown (ADR-0013), without wrapping quotes, and at most `maxChars`
 * long, cut at a word. `singleLine` makes it one line, for a bubble.
 */
export function cleanAnswer(
  text: string,
  { maxChars, singleLine = false }: { maxChars: number; singleLine?: boolean },
): string {
  let clean = text
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
