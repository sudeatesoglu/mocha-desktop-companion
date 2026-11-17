import { describe, expect, it } from 'vitest';
import { loginItemView } from './login-item.ts';

describe('loginItemView', () => {
  it('is never available in a development build', () => {
    expect(loginItemView(false, { openAtLogin: true, status: 'enabled' })).toEqual({
      available: false,
      openAtLogin: false,
      needsApproval: false,
    });
  });

  it('reports the system state in the installed app', () => {
    expect(loginItemView(true, { openAtLogin: true, status: 'enabled' })).toEqual({
      available: true,
      openAtLogin: true,
      needsApproval: false,
    });
    expect(loginItemView(true, { openAtLogin: false })).toMatchObject({ openAtLogin: false });
  });

  it('counts a login item waiting for approval as on, and says so', () => {
    expect(loginItemView(true, { openAtLogin: false, status: 'requires-approval' })).toEqual({
      available: true,
      openAtLogin: true,
      needsApproval: true,
    });
  });
});
