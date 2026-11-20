import { EXTENSION_PUBLIC_KEY } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { extensionManifest } from './manifest.ts';

describe('extensionManifest', () => {
  const manifest = extensionManifest('1.2.3');

  it('is a Manifest V3 extension with the given version', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe('1.2.3');
  });

  it('carries the key that fixes the ID Mocha accepts', () => {
    expect(manifest.key).toBe(EXTENSION_PUBLIC_KEY);
  });

  it('asks only for storage up front, and for tabs when the user turns something on', () => {
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.optional_permissions).toEqual(['tabs']);
  });

  it('asks for no host access, so Chrome always sends Mocha its Origin', () => {
    expect(manifest).not.toHaveProperty('host_permissions');
    expect(manifest).not.toHaveProperty('optional_host_permissions');
  });

  it('may reach Mocha on this computer and nothing else', () => {
    expect(manifest.content_security_policy.extension_pages).toContain(
      'connect-src http://127.0.0.1:*;',
    );
    expect(manifest.content_security_policy.extension_pages).toContain("script-src 'self';");
  });
});
