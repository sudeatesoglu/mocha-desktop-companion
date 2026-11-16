import { describe, expect, it } from 'vitest';
import { loginItemHint } from './login-item.ts';

describe('loginItemHint', () => {
  it('says why a development build cannot change it', () => {
    expect(loginItemHint({ available: false, openAtLogin: false, needsApproval: false })).toBe(
      'Available in the installed app.',
    );
  });

  it('points to System Settings when macOS waits for approval', () => {
    expect(loginItemHint({ available: true, openAtLogin: true, needsApproval: true })).toBe(
      'Allow Mocha in System Settings → General → Login Items.',
    );
  });

  it('says what happens otherwise', () => {
    expect(loginItemHint({ available: true, openAtLogin: false, needsApproval: false })).toBe(
      'Mocha starts quietly in the menu bar.',
    );
  });
});
