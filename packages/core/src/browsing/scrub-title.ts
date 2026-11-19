/** The longest title Mocha keeps, after scrubbing (ADR-0012). */
export const MAX_TITLE_LENGTH = 80;

// What could identify a person or an account, removed from titles. Order
// matters: addresses, IBANs and tokens go before the digit rules see their
// parts.
const PRIVATE_PATTERNS: readonly RegExp[] = [
  /\bhttps?:\/\/\S+|\bwww\.\S+/gi, // web addresses
  /[^\s@]+@[^\s@]+\.[^\s@]+/g, // email addresses
  /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g, // IBANs
  /\b(?=[\w-]*\d)(?=[\w-]*[A-Za-z])[\w-]{16,}\b/g, // tokens: long mixed letters and digits
  /\+?\d[\d ().-]{7,}\d/g, // phone, card and account numbers with separators
  /\d{5,}/g, // order numbers, IDs and other long digit runs
];

/**
 * A page title with anything that could identify a person or an account
 * taken out, then shortened. Removing too much is fine: Mocha only needs
 * enough to make a comment.
 */
export function scrubTitle(title: string): string {
  let scrubbed = title;
  for (const pattern of PRIVATE_PATTERNS) scrubbed = scrubbed.replace(pattern, ' ');
  scrubbed = scrubbed
    .replace(/\s+/g, ' ')
    // separators left dangling at the ends, like "| Inbox -"
    .replace(/^[\s|•·:–—-]+|[\s|•·:–—-]+$/g, '')
    .trim();
  if (scrubbed.length <= MAX_TITLE_LENGTH) return scrubbed;
  return `${scrubbed.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}
