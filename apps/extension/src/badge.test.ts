import { describe, expect, it } from 'vitest';
import { badgeFor } from './badge.ts';

const state = { connection: 'connected' as const, paused: false, needsPermission: false };

describe('badgeFor', () => {
  it('shows nothing when all is well, or when Mocha is simply not running', () => {
    expect(badgeFor(state)).toEqual({ text: '', title: 'Mocha: Paired with Mocha.' });
    expect(badgeFor({ ...state, connection: 'not running' }).text).toBe('');
  });

  it('marks what the user can fix', () => {
    expect(badgeFor({ ...state, connection: 'wrong code' }).text).toBe('!');
    expect(badgeFor({ ...state, connection: 'unexpected' }).text).toBe('!');
    expect(badgeFor({ ...state, needsPermission: true })).toMatchObject({
      text: '!',
      title: expect.stringContaining('needs your OK'),
    });
  });

  it('says when it is paused, before anything else', () => {
    expect(badgeFor({ ...state, connection: 'wrong code', paused: true })).toEqual({
      text: 'off',
      title: 'Mocha: paused. Nothing is sent.',
    });
  });
});
