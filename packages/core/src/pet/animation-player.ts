import type {
  AnimationName,
  SkinAnimation,
  SkinFrame,
  SkinManifest,
} from '../skin/skin-manifest.ts';

export interface AnimationPlayer {
  /** The animation actually playing (after falling back to idle). */
  readonly current: AnimationName;
  /**
   * The looping pose held between other animations: "idle" unless another
   * pose, such as "tired", was set. Playing "idle" plays it, and one-shot
   * animations return to it.
   */
  readonly base: AnimationName;
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
  /**
   * Sets the base pose; a pose the skin does not define falls back to idle.
   * If the old base is showing, the new one starts now; another animation
   * plays on and returns to the new base. Returns true if the frame changed.
   */
  setBase(name: AnimationName): boolean;
}

/**
 * Plays a skin's animations using each frame's own duration. One-shot
 * animations (loop: false) return to the base pose when they end, so the
 * pet is always in a defined state.
 */
export function createAnimationPlayer(animations: SkinManifest['animations']): AnimationPlayer {
  let current: AnimationName = 'idle';
  let base: AnimationName = 'idle';
  let baseAnimation: SkinAnimation = animations.idle;
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
      start(base, baseAnimation);
    }
  }

  return {
    get current() {
      return current;
    },
    get frame() {
      return frame;
    },
    get base() {
      return base;
    },

    play(name) {
      const wanted = name === 'idle' ? base : name;
      const requested = animations[wanted];
      const [target, next] = requested ? [wanted, requested] : (['idle', animations.idle] as const);
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

    setBase(name) {
      const requested = animations[name];
      const [next, nextAnimation] = requested
        ? [name, requested]
        : (['idle', animations.idle] as const);
      if (next === base) return false;
      const holdingBase = current === base;
      base = next;
      baseAnimation = nextAnimation;
      if (!holdingBase) return false;
      const before = frame.index;
      start(base, baseAnimation);
      return frame.index !== before;
    },
  };
}
