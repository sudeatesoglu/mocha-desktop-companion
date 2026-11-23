import type { SiteKind } from './context.ts';
import { matchesDomain, registrableDomain } from './domains.ts';
import { isSensitivePath, sensitiveKind } from './sensitive.ts';
import { classifySite } from './site-kinds.ts';

/** Why a page is not sent. It stays in the extension, for its own status line. */
export type HoldReason =
  | 'private window'
  | 'not a web page'
  | 'private network'
  | 'sensitive'
  | 'excluded';

export type PageVerdict =
  | { readonly send: false; readonly reason: HoldReason }
  | {
      readonly send: true;
      readonly site: string;
      readonly kind: SiteKind;
      /** Conversation titles in AI chats can be personal: not sent. */
      readonly titleAllowed: boolean;
    };

// The parts of an address the filter needs: scheme, host and path. Any
// user name and password before the host are skipped. Core is platform-free
// and has no URL class; this is all the filter takes.
const ADDRESS =
  /^([a-z][a-z0-9+.-]*:)(?:\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]*)(?::\d*)?)?([^?#]*)/i;

// Addresses that can only be this computer or a private network.
const PRIVATE_HOST =
  /^(localhost|.*\.(local|localhost|internal|lan|home|home\.arpa|corp))$|^\[|^\d+\.\d+\.\d+\.\d+$/i;

/**
 * Whether a page may be sent to Mocha at all (ADR-0012), and if so as which
 * site and kind. Everything it refuses never leaves the browser.
 */
export function filterPage(page: {
  url: string;
  incognito: boolean;
  exclusions: readonly string[];
}): PageVerdict {
  if (page.incognito) return { send: false, reason: 'private window' };
  const [, protocol = '', hostname = '', pathname = ''] = ADDRESS.exec(page.url.trim()) ?? [];
  if (!/^https?:$/i.test(protocol) || !hostname) return { send: false, reason: 'not a web page' };
  // "localhost." is localhost: the trailing dot only says the name is complete.
  const host = hostname.toLowerCase().replace(/\.$/, '');
  // A name without dots is an intranet host; IP addresses are never shown.
  if (PRIVATE_HOST.test(host) || !host.includes('.')) {
    return { send: false, reason: 'private network' };
  }
  if (sensitiveKind(host) || isSensitivePath(pathname)) {
    return { send: false, reason: 'sensitive' };
  }
  if (page.exclusions.some((domain) => matchesDomain(host, domain))) {
    return { send: false, reason: 'excluded' };
  }
  const kind = classifySite(host, pathname);
  return { send: true, site: registrableDomain(host), kind, titleAllowed: kind !== 'chat' };
}
