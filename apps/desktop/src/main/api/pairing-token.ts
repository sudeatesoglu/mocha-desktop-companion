import { randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32 without padding: easy to read and to paste. */
export function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let text = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      text += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) text += ALPHABET[(value << (5 - bits)) & 31];
  return text;
}

/** A new pairing token: 128 random bits (ADR-0011). */
export function newPairingToken(random: (size: number) => Uint8Array = randomBytes): string {
  return base32(random(16));
}
