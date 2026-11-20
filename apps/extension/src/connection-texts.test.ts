import { describe, expect, it } from 'vitest';
import { CONNECTION_TEXTS } from './connection-texts.ts';

describe('CONNECTION_TEXTS', () => {
  it('says what to do whenever Mocha cannot be reached', () => {
    expect(CONNECTION_TEXTS['not running']).toContain('Settings');
    expect(CONNECTION_TEXTS['wrong code']).toContain('Copy it again');
  });
});
