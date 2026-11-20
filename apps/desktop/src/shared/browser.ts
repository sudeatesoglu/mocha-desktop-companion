import type { BrowserCapabilities } from '@mocha/core';

/** The browser companion as the settings window shows it. */
export interface BrowserView {
  /** Whether the extension may connect. */
  allowed: boolean;
  /** The code to paste into the extension, while the API listens. */
  pairingCode: string | null;
  capabilities: BrowserCapabilities;
}
