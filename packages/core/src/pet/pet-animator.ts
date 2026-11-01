import type { AnimationName, SkinFrame, SkinManifest } from '../skin/skin-manifest.ts';
import { createAnimationPlayer } from './animation-player.ts';
import { createBlinkTimer } from './blink-timer.ts';

export interface PetAnimatorOptions {
  /** Shortest and longest pause between blinks. */
  blinkMinMs?: number;
  blinkMaxMs?: number;
  /** Returns a number in [0, 1). Pass Math.random in the app. */
  random: () => number;
}

export interface PetAnimator {
  readonly current: AnimationName;
  readonly frame: SkinFrame;
  /** Plays an animation (see AnimationPlayer.play). Returns true if the frame changed. */
  play(name: AnimationName): boolean;
  /** Advances by `stepMs`. Returns true if the frame changed. */
  update(stepMs: number): boolean;
}

/**
 * Mocha's animation behavior: idle by default, blinking now and then while
 * idle, and one-shot animations (like a hop) on request.
 */
export function createPetAnimator(
  animations: SkinManifest['animations'],
  { blinkMinMs = 2_500, blinkMaxMs = 6_000, random }: PetAnimatorOptions,
): PetAnimator {
  const player = createAnimationPlayer(animations);
  const blink = createBlinkTimer({ minMs: blinkMinMs, maxMs: blinkMaxMs, random });
  const canBlink = animations.blink !== undefined;

  return {
    get current() {
      return player.current;
    },
    get frame() {
      return player.frame;
    },

    play(name) {
      const changed = player.play(name);
      // The blink countdown only runs while idle; start a fresh wait after.
      if (player.current !== 'idle') blink.reset();
      return changed;
    },

    update(stepMs) {
      if (player.current === 'idle' && canBlink && blink.update(stepMs)) {
        // Start the blink on its first frame; it advances from the next step.
        return player.play('blink');
      }
      return player.update(stepMs);
    },
  };
}
