/** A pairing token: 128 random bits as 26 base32 characters (ADR-0011). */
const TOKEN = /^[A-Z2-7]{26}$/;

/**
 * The pairing code the user copies from Mocha's Settings into the
 * extension: where Mocha listens and the token it expects, like
 * "47213-ABCDEFGHIJKLMNOPQRSTUVWXYZ".
 */
export function formatPairingCode(port: number, token: string): string {
  return `${port}-${token}`;
}

/** The port and token in a pasted pairing code, or undefined if it is not one. */
export function parsePairingCode(code: string): { port: number; token: string } | undefined {
  const match = /^(\d{4,5})-([A-Za-z2-7]+)$/.exec(code.trim());
  if (!match?.[1] || !match[2]) return undefined;
  const port = Number(match[1]);
  const token = match[2].toUpperCase();
  if (port < 1024 || port > 65535 || !TOKEN.test(token)) return undefined;
  return { port, token };
}
