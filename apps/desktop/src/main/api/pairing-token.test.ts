import { describe, expect, it } from 'vitest';
import { base32, newPairingToken } from './pairing-token.ts';

describe('base32', () => {
  it.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foobar', 'MZXW6YTBOI'],
  ])('encodes "%s" as RFC 4648 says, without padding', (text, expected) => {
    expect(base32(new TextEncoder().encode(text))).toBe(expected);
  });
});

describe('newPairingToken', () => {
  it('turns 16 random bytes into 26 base32 characters', () => {
    const token = newPairingToken(() => new Uint8Array(16).fill(255));

    expect(token).toBe(`${'7'.repeat(25)}4`);
    expect(token).toMatch(/^[A-Z2-7]{26}$/);
  });

  it('is different every time', () => {
    expect(newPairingToken()).not.toBe(newPairingToken());
  });
});
