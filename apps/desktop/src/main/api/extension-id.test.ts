import { createHash } from 'node:crypto';
import { EXTENSION_ID, EXTENSION_ORIGIN, EXTENSION_PUBLIC_KEY } from '@mocha/core';
import { describe, expect, it } from 'vitest';

/** Chrome's ID for an unpacked extension: the key's SHA-256, first 32 hex digits as a to p. */
function extensionIdFor(publicKeyBase64: string): string {
  const digest = createHash('sha256').update(Buffer.from(publicKeyBase64, 'base64')).digest('hex');
  return [...digest.slice(0, 32)]
    .map((digit) => String.fromCharCode('a'.charCodeAt(0) + Number.parseInt(digit, 16)))
    .join('');
}

describe('the extension identity', () => {
  it('has the ID Chrome derives from its public key', () => {
    expect(extensionIdFor(EXTENSION_PUBLIC_KEY)).toBe(EXTENSION_ID);
  });

  it('is recognized by its chrome-extension origin', () => {
    expect(EXTENSION_ORIGIN).toBe(`chrome-extension://${EXTENSION_ID}`);
  });
});
