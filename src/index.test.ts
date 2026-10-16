import { describe, expect, it } from 'vitest';
import { APP_NAME, greet } from './index.ts';

describe('greet', () => {
  it('introduces the companion by name', () => {
    expect(greet('Soda')).toBe(`Hi Soda, I'm ${APP_NAME}!`);
  });
});
