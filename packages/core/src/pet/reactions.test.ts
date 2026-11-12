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
      // Spaced just beyond a double click, so no pair opens the Tower.
      detector.click();
      detector.update(1000);
      detector.click();
      detector.update(450);
      detector.click();

      detector.update(150); // the first click is now 1600 ms old

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

  describe('opening the Tower (double click)', () => {
    const towerOptions = { ...options, doubleClickMs: 400, towerDelayMs: 350 };

    it('opens once a double click got no third click within the delay', () => {
      const detector = createReactionDetector(towerOptions);
      detector.click();
      detector.update(200);
      expect(detector.click()).toBeUndefined();

      expect(detector.update(300)).toBeUndefined();
      expect(detector.update(50)).toBe('tower');
      expect(detector.update(1_000)).toBeUndefined(); // only once
    });

    it('does not open for two clicks too far apart', () => {
      const detector = createReactionDetector(towerOptions);
      detector.click();
      detector.update(450);
      detector.click();

      expect(detector.update(1_000)).toBeUndefined();
    });

    it('never opens on the way to dizzy', () => {
      const detector = createReactionDetector(towerOptions);
      const seen: unknown[] = [];
      for (let i = 0; i < 4; i++) {
        seen.push(detector.click());
        seen.push(detector.update(200));
      }

      expect(seen).not.toContain('tower');
      expect(seen).toContain('dizzy');
    });

    it('forgets the clicks that opened it, so they do not count towards dizzy', () => {
      const detector = createReactionDetector(towerOptions);
      detector.click();
      detector.click();
      expect(detector.update(350)).toBe('tower');

      detector.click();
      detector.update(200);
      detector.click();
      detector.click();

      expect(detector.click()).toBe('dizzy'); // four new clicks, not two
    });

    it('opens with the default timing', () => {
      const detector = createReactionDetector();
      detector.click();
      detector.click();

      expect(detector.update(1_000)).toBe('tower');
    });
  });

  describe('slipping (Space switch)', () => {
    it('slips when the desktop moves under Mocha', () => {
      expect(createReactionDetector(options).spaceChanged()).toBe('slip');
    });

    it('slips at most once per cooldown when the user swipes repeatedly', () => {
      const detector = createReactionDetector({ ...options, slipCooldownMs: 1200 });
      detector.spaceChanged();

      detector.update(1199);
      expect(detector.spaceChanged()).toBeUndefined();

      detector.update(1);
      expect(detector.spaceChanged()).toBe('slip');
    });

    it('starts the petting cooldown too, so a hop does not cut the slip short', () => {
      const detector = createReactionDetector(options);
      detector.spaceChanged();

      expect(detector.hover()).toBeUndefined();
    });

    it('slips even right after being petted: the floor moving wins', () => {
      const detector = createReactionDetector(options);
      detector.hover();

      expect(detector.spaceChanged()).toBe('slip');
    });
  });

  it('uses sensible defaults', () => {
    const detector = createReactionDetector();

    expect(detector.hover()).toBe('pet');
  });

  it.each([
    ['a negative cooldown', { petCooldownMs: -1 }],
    // Two would make every double click dizzy, and the Tower unreachable.
    ['fewer than three clicks for dizziness', { dizzyClicks: 2 }],
    ['a zero click window', { dizzyWindowMs: 0 }],
    ['a zero double-click interval', { doubleClickMs: 0 }],
    ['a zero Tower delay', { towerDelayMs: 0 }],
    ['a negative slip cooldown', { slipCooldownMs: -1 }],
  ])('rejects %s', (_case, invalid) => {
    expect(() => createReactionDetector({ ...options, ...invalid })).toThrow(RangeError);
  });
});
