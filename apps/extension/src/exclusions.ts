import { MAX_EXCLUSIONS } from './settings.ts';

const DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;

/**
 * The site to leave out, from what the user typed or pasted: an address or
 * a domain. "https://www.reddit.com/r/all" becomes "reddit.com", which also
 * covers old.reddit.com.
 */
export function parseExclusion(input: string): string | undefined {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '') // the scheme
    .replace(/^[^@/]*@/, '') // a user name and password
    .split(/[/?#:]/)[0]
    ?.replace(/\.$/, '')
    .replace(/^www\./, '');
  return host && DOMAIN.test(host) ? host : undefined;
}

/** `list` with `domain`, sorted and without duplicates, or undefined when full. */
export function withExclusion(list: readonly string[], domain: string): string[] | undefined {
  if (list.includes(domain)) return [...list];
  if (list.length >= MAX_EXCLUSIONS) return undefined;
  return [...list, domain].sort();
}
