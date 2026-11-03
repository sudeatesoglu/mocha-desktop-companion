import { describe, expect, it } from 'vitest';
import { createReactionDetector } from './reactions.ts';

const options = { petCooldownMs: 1500, dizzyClicks: 4, dizzyWindowMs: 1500 };

describe('createReactionDetector', () => {
  describe('petting (hover)', () => {
    it('reacts to the first hover', () => {
      expect(createReactionDetector(options).hover()).toBe('pet');
    });

    it('ignores repeated hovers during the cooldown', () => {
      const detector = createReactionDetector(options);
      detector.hover();

      detector.update(1499);

      expect(detector.hover()).toBeUndefined();
    });

    it('reacts again once the cooldown has passed', () => {
      const detector = createReactionDetector(options);
      detector.hover();

      detector.update(1500);

      expect(detector.hover()).toBe('pet');
    });

    it('does not extend the cooldown with ignored hovers', () => {
      const detector = createReactionDetector(options);
      detector.hover();
      detector.update(1000);
      detector.hover(); // ignored

      detector.update(500);

      expect(detector.hover()).toBe('pet');
    });
  });

  describe('dizziness (rapid clicks)', () => {
    it('gets dizzy on the fourth click within the window', () => {
      const detector = createReactionDetector(options);

      expect(detector.click()).toBeUndefined();
      detector.update(300);
      expect(detector.click()).toBeUndefined();
      detector.update(300);
      expect(detector.click()).toBeUndefined();
      detector.update(300);
      expect(detector.click()).toBe('dizzy');
    });

    it('forgets clicks that fell out of the window', () => {
      const detector = createReactionDetector(options);
      detector.click();
      detector.update(1000);
      detector.click();
      detector.click();

      detector.update(600); // the first click is now 1600 ms old

      expect(detector.click()).toBeUndefined();
      expect(detector.click()).toBe('dizzy');
    });

    it('starts counting from zero after getting dizzy', () => {
      const detector = createReactionDetector(options);
      for (let i = 0; i < 4; i++) detector.click();

      expect(detector.click()).toBeUndefined();
      expect(detector.click()).toBeUndefined();
      expect(detector.click()).toBeUndefined();
      expect(detector.click()).toBe('dizzy');
    });

    it('does not pet while dizzy is the stronger reaction in progress', () => {
      const detector = createReactionDetector(options);
      for (let i = 0; i < 4; i++) detector.click();

      // Dizziness starts the petting cooldown too: no hop right after it.
      expect(detector.hover()).toBeUndefined();
    });
  });

  it('uses sensible defaults', () => {
    const detector = createReactionDetector();

    expect(detector.hover()).toBe('pet');
  });

  it.each([
    ['a negative cooldown', { petCooldownMs: -1 }],
    ['fewer than two clicks for dizziness', { dizzyClicks: 1 }],
    ['a zero click window', { dizzyWindowMs: 0 }],
  ])('rejects %s', (_case, invalid) => {
    expect(() => createReactionDetector({ ...options, ...invalid })).toThrow(RangeError);
  });
});
