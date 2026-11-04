import { describe, expect, it } from 'vitest';
import type { SkinManifest } from '../skin/skin-manifest.ts';
import { createPetAnimator } from './pet-animator.ts';

const frame = (index: number, durationMs: number) => ({ index, durationMs });

const ANIMATIONS: SkinManifest['animations'] = {
  idle: { loop: true, frames: [frame(0, 800), frame(1, 800)] },
  blink: { loop: false, frames: [frame(2, 100)] },
  hop: { loop: false, frames: [frame(4, 300)] },
};

const options = { blinkMinMs: 1000, blinkMaxMs: 1000, random: () => 0 };

describe('createPetAnimator', () => {
  it('blinks while idle once the blink timer fires, then returns to idle', () => {
    const animator = createPetAnimator(ANIMATIONS, options);

    animator.update(900);
    expect(animator.frame.index).toBe(1);

    expect(animator.update(100)).toBe(true); // 1000 ms: blink
    expect(animator.frame.index).toBe(2);

    animator.update(100);
    expect(animator.frame.index).toBe(0); // blink done, idle again
  });

  it('does not blink in the middle of another animation, and waits again afterwards', () => {
    const animator = createPetAnimator(ANIMATIONS, options);
    animator.update(800);
    animator.play('hop');

    animator.update(250); // 1050 ms total: the timer must not interrupt the hop
    expect(animator.frame.index).toBe(4);

    animator.update(50); // hop ends
    animator.update(900); // a fresh full wait has not passed yet
    expect(animator.frame.index).not.toBe(2);
    animator.update(100);
    expect(animator.frame.index).toBe(2);
  });

  it('keeps the blink countdown when idle is requested while already idle', () => {
    const animator = createPetAnimator(ANIMATIONS, options);
    animator.update(900);

    animator.play('idle');
    animator.update(100);

    expect(animator.frame.index).toBe(2); // the wait was not restarted
  });

  it('skips blinking for skins without a blink animation', () => {
    const animator = createPetAnimator({ idle: ANIMATIONS.idle }, options);

    animator.update(1000);

    expect(animator.frame.index).toBe(1); // still idle; no fallback flicker
  });

  it('reports a changed frame when play switches animations', () => {
    const animator = createPetAnimator(ANIMATIONS, options);

    expect(animator.play('hop')).toBe(true);
    expect(animator.current).toBe('hop');
    expect(animator.frame.index).toBe(4);
  });
});
