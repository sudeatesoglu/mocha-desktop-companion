import { describe, expect, it } from 'vitest';
import { APP_NAME, greet } from './index.ts';

describe('greet', () => {
  it('introduces the companion by name', () => {
    expect(greet('Ada')).toBe(`Hi Ada, I'm ${APP_NAME}!`);
  });
});
