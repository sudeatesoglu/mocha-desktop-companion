import { describe, expect, it } from 'vitest';
import { formatPairingCode, parsePairingCode } from './pairing.ts';

const TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

describe('pairing codes', () => {
  it('round-trips the port and the token', () => {
    const code = formatPairingCode(47213, TOKEN);

    expect(code).toBe(`47213-${TOKEN}`);
    expect(parsePairingCode(code)).toEqual({ port: 47213, token: TOKEN });
  });

  it('forgives spaces around a pasted code and lowercase letters', () => {
    expect(parsePairingCode(`  47213-${TOKEN.toLowerCase()}\n`)).toEqual({
      port: 47213,
      token: TOKEN,
    });
  });

  it.each([
    ['an empty code', ''],
    ['no port', TOKEN],
    ['a privileged port', `80-${TOKEN}`],
    ['a port too high', `70000-${TOKEN}`],
    ['a short token', '47213-ABC'],
    ['a token with other letters', `47213-${'1'.repeat(26)}`],
    ['extra text', `47213-${TOKEN} please`],
  ])('refuses %s', (_case, code) => {
    expect(parsePairingCode(code)).toBeUndefined();
  });
});
