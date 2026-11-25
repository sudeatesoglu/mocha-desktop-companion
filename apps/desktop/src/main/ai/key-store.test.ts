import { describe, expect, it } from 'vitest';
import { createKeyStore } from './key-store.ts';

const KEY = 'sk-ant-api03-0123456789abcdefghijKLMN';

// Stands in for the keychain: reversible, and never the plain key.
const fakeEncryption = (available = true) => ({
  isEncryptionAvailable: () => available,
  encryptString: (text: string) => Buffer.from([...text].reverse().join(''), 'utf8'),
  decryptString: (encrypted: Buffer) => [...encrypted.toString('utf8')].reverse().join(''),
});

describe('createKeyStore', () => {
  it('stores only the encrypted key, and reads it back', () => {
    const store = createKeyStore(fakeEncryption());
    const sealed = store.seal(`  ${KEY}\n`) as string;

    expect(sealed).not.toContain(KEY);
    expect(Buffer.from(sealed, 'base64').toString('utf8')).not.toContain(KEY);
    expect(store.open(sealed)).toBe(KEY);
  });

  it('stores nothing without the keychain, and refuses what is not a key', () => {
    expect(createKeyStore(fakeEncryption(false)).seal(KEY)).toBeUndefined();
    expect(createKeyStore(fakeEncryption()).seal('my password')).toBeUndefined();
  });

  it('reads back nothing that is missing, unreadable or not a key', () => {
    const store = createKeyStore(fakeEncryption());
    const broken = createKeyStore({
      ...fakeEncryption(),
      decryptString: () => {
        throw new Error('bad');
      },
    });

    expect(store.open(undefined)).toBeUndefined();
    expect(createKeyStore(fakeEncryption(false)).open('abc')).toBeUndefined();
    expect(broken.open('abc')).toBeUndefined();
    expect(store.open(Buffer.from('olleh').toString('base64'))).toBeUndefined();
  });
});
