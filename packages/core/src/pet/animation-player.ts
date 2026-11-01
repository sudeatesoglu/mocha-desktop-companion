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
  let frame: SkinFrame = animation.frames[0];
  let elapsedMs = 0;

  function start(name: AnimationName, next: SkinAnimation): void {
    current = name;
    animation = next;
    index = 0;
    frame = next.frames[0];
    elapsedMs = 0;
  }

  /** Moves to the next frame, wrapping or returning to idle at the end. */
  function advance(): void {
    const next = animation.frames[index + 1];
    if (next) {
      index += 1;
      frame = next;
    } else if (animation.loop) {
      index = 0;
      frame = animation.frames[0];
    } else {
      start('idle', animations.idle);
    }
  }

  return {
    get current() {
      return current;
    },
    get frame() {
      return frame;
    },

    play(name) {
      const requested = animations[name];
      const [target, next] = requested ? [name, requested] : (['idle', animations.idle] as const);
      if (target === current && next.loop) return false;

      const before = frame.index;
      start(target, next);
      return frame.index !== before;
    },

    update(stepMs) {
      const before = frame.index;
      elapsedMs += stepMs;
      // Schema guarantees durations >= 16 ms, so this loop always ends.
      while (elapsedMs >= frame.durationMs) {
        elapsedMs -= frame.durationMs;
        advance();
      }
      return frame.index !== before;
    },
  };
}
