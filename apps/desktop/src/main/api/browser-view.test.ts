import { NO_BROWSER_CAPABILITIES } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { browserView } from './browser-view.ts';

const TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('browserView', () => {
  it('shows the pairing code while allowed, paired and listening', () => {
    expect(
      browserView({ allowed: true, token: TOKEN, capabilities: NO_BROWSER_CAPABILITIES }, 47213),
    ).toEqual({
      allowed: true,
      pairingCode: `47213-${TOKEN}`,
      capabilities: NO_BROWSER_CAPABILITIES,
    });
  });

  it.each([
    ['not allowed', { allowed: false, token: TOKEN }, 47213],
    ['not paired yet', { allowed: true }, 47213],
    ['not listening', { allowed: true, token: TOKEN }, undefined],
  ] as const)('shows no code while %s', (_case, browser, port) => {
    expect(
      browserView({ ...browser, capabilities: NO_BROWSER_CAPABILITIES }, port).pairingCode,
    ).toBeNull();
  });
});
