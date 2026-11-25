/** Electron's safeStorage, as far as the key store needs it. */
export interface Encryption {
  isEncryptionAvailable(): boolean;
  encryptString(text: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

/** What a Claude key looks like; anything else is refused before it is stored. */
const KEY = /^sk-ant-[\w-]{20,200}$/;

/**
 * The user's Claude key, encrypted with the operating system's keychain
 * (ADR-0013). Only the encrypted form is ever stored, as base64; with no
 * encryption available, the key is not stored at all.
 */
export function createKeyStore(encryption: Encryption) {
  return {
    /** The encrypted key to store, or undefined when it must not be stored. */
    seal(key: string): string | undefined {
      const trimmed = key.trim();
      if (!KEY.test(trimmed) || !encryption.isEncryptionAvailable()) return undefined;
      return encryption.encryptString(trimmed).toString('base64');
    },
    /** The key itself, or undefined when it cannot be read back. */
    open(sealed: string | undefined): string | undefined {
      if (!sealed || !encryption.isEncryptionAvailable()) return undefined;
      try {
        const key = encryption.decryptString(Buffer.from(sealed, 'base64'));
        return KEY.test(key) ? key : undefined;
      } catch {
        return undefined;
      }
    },
  };
}
