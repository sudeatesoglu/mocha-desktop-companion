import { type BrowserCapabilities, formatPairingCode } from '@mocha/core';
import type { BrowserView } from '../../shared/browser.ts';

/**
 * What Settings shows: the pairing code only while the extension is allowed,
 * paired and the API listens, so it never shows a code that cannot work.
 */
export function browserView(
  browser: { allowed: boolean; token?: string | undefined; capabilities: BrowserCapabilities },
  listeningPort: number | undefined,
): BrowserView {
  const ready = browser.allowed && browser.token !== undefined && listeningPort !== undefined;
  return {
    allowed: browser.allowed,
    pairingCode: ready ? formatPairingCode(listeningPort, browser.token as string) : null,
    capabilities: browser.capabilities,
  };
}
