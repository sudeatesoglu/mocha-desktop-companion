import { describe, expect, it } from 'vitest';
import { createActivityCounter, isSecretField, SCROLL_GAP_MS } from './activity-counter.ts';

function counter() {
  let now = 0;
  const count = createActivityCounter(() => now);
  const at = (ms: number) => {
    now = ms;
  };
  return { count, at };
}

describe('createActivityCounter', () => {
  it('counts presses, scrolls and clicks over the window', () => {
    const { count, at } = counter();
    count.key({ repeat: false, secret: false });
    count.key({ repeat: false, secret: false });
    count.click();
    count.scroll();
    at(30_000);

    expect(count.take()).toEqual({ keys: 2, scrolls: 1, clicks: 1, windowSeconds: 30 });
  });

  it('does not count keys in secret fields, or a held key over and over', () => {
    const { count } = counter();
    count.key({ repeat: false, secret: true });
    count.key({ repeat: true, secret: false });

    expect(count.take().keys).toBe(0);
  });

  it('counts one scroll gesture once', () => {
    const { count, at } = counter();
    for (const ms of [0, 50, 100, 200]) {
      at(ms);
      count.scroll();
    }
    at(200 + SCROLL_GAP_MS);
    count.scroll();

    expect(count.take().scrolls).toBe(2);
  });

  it('starts over after each take', () => {
    const { count, at } = counter();
    count.click();
    at(30_000);
    count.take();
    at(45_000);

    expect(count.take()).toEqual({ keys: 0, scrolls: 0, clicks: 0, windowSeconds: 15 });
  });

  it('stays within the API’s bounds', () => {
    const { count, at } = counter();
    for (let i = 0; i < 100_001; i += 1) count.click();
    at(3_600_000);

    expect(count.take()).toMatchObject({ clicks: 100_000, windowSeconds: 600 });
    expect(count.take().windowSeconds).toBe(1);
  });
});

describe('isSecretField', () => {
  it.each([
    [{ tagName: 'INPUT', type: 'password' }],
    [{ tagName: 'INPUT', type: 'text', autocomplete: 'current-password' }],
    [{ tagName: 'INPUT', type: 'text', autocomplete: 'new-password' }],
    [{ tagName: 'INPUT', type: 'text', autocomplete: 'one-time-code' }],
    [{ tagName: 'INPUT', type: 'tel', autocomplete: 'cc-number' }],
    [{ tagName: 'INPUT', type: 'text', autocomplete: 'section-pay cc-csc' }],
  ])('keeps %j secret', (field) => {
    expect(isSecretField(field)).toBe(true);
  });

  it.each([
    [{ tagName: 'INPUT', type: 'text' }],
    [{ tagName: 'INPUT', type: 'search', autocomplete: 'off' }],
    [{ tagName: 'TEXTAREA' }],
    [{ tagName: 'DIV' }],
  ])('counts typing in %j', (field) => {
    expect(isSecretField(field)).toBe(false);
  });
});
