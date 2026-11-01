import type {
  AnimationName,
  SkinAnimation,
  SkinFrame,
  SkinManifest,
} from '../skin/skin-manifest.ts';

export interface AnimationPlayer {
  /** The animation actually playing (after falling back to idle). */
  readonly current: AnimationName;
  /** The frame to draw now. */
  readonly frame: SkinFrame;
  /**
   * Switches to an animation. A looping animation that is already playing
   * keeps running; a one-shot animation restarts. Animations the skin does
   * not define fall back to idle. Returns true if the visible frame changed.
   */
  play(name: AnimationName): boolean;
  /** Advances by `stepMs`. Returns true if the visible frame changed. */
  update(stepMs: number): boolean;
}

/**
 * Plays a skin's animations using each frame's own duration. One-shot
 * animations (loop: false) return to idle when they end, so the pet is
 * always in a defined state.
 */
export function createAnimationPlayer(animations: SkinManifest['animations']): AnimationPlayer {
  let current: AnimationName = 'idle';
  let animation: SkinAnimation = animations.idle;
  let index = 0;
  let elapsedMs = 0;

  const frameNow = (): SkinFrame => animation.frames[index] ?? animation.frames[0];

  function start(name: AnimationName, next: SkinAnimation): void {
    current = name;
    animation = next;
    index = 0;
    elapsedMs = 0;
  }

  return {
    get current() {
      return current;
    },
    get frame() {
      return frameNow();
    },

    play(name) {
      const requested = animations[name];
      const [target, next] = requested ? [name, requested] : (['idle', animations.idle] as const);
      if (target === current && next.loop) return false;

      const before = frameNow().index;
      start(target, next);
      return frameNow().index !== before;
    },

    update(stepMs) {
      const before = frameNow().index;
      elapsedMs += stepMs;
      // Schema guarantees durations >= 16 ms, so this loop always ends.
      while (elapsedMs >= frameNow().durationMs) {
        elapsedMs -= frameNow().durationMs;
        if (index + 1 < animation.frames.length) {
          index += 1;
        } else if (animation.loop) {
          index = 0;
        } else {
          start('idle', animations.idle);
        }
      }
      return frameNow().index !== before;
    },
  };
}
