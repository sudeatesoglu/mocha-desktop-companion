/** How Mocha responds to direct interaction. */
export type Reaction = 'pet' | 'dizzy' | 'slip';

export interface ReactionOptions {
  /** Minimum time between two petting reactions. */
  petCooldownMs?: number;
  /** Clicks within `dizzyWindowMs` that make Mocha dizzy. */
  dizzyClicks?: number;
  dizzyWindowMs?: number;
  /** Minimum time between two slips when the user switches Spaces. */
  slipCooldownMs?: number;
}

export interface ReactionDetector {
  /** Advances the detector's clock. */
  update(stepMs: number): void;
  /** The cursor started hovering over Mocha. */
  hover(): Reaction | undefined;
  /** Mocha was clicked. */
  click(): Reaction | undefined;
  /** The user switched to another Space: the floor moved under Mocha. */
  spaceChanged(): Reaction | undefined;
}

/**
 * Turns raw input into reactions:
 * - hovering pets Mocha, at most once per cooldown, so sweeping the cursor
 *   back and forth does not make it hop nonstop
 * - several clicks in quick succession make it dizzy (a sliding window of
 *   recent click times)
 * - switching Spaces makes it slip, at most once per cooldown, so a series
 *   of swipes is one stumble, not a chain of them
 *
 * Time comes from update(), so behavior is deterministic and testable.
 */
export function createReactionDetector({
  petCooldownMs = 1_500,
  dizzyClicks = 4,
  dizzyWindowMs = 1_500,
  slipCooldownMs = 1_500,
}: ReactionOptions = {}): ReactionDetector {
  if (
    !(petCooldownMs >= 0) ||
    !(dizzyClicks >= 2) ||
    !(dizzyWindowMs > 0) ||
    !(slipCooldownMs >= 0)
  ) {
    throw new RangeError('invalid reaction options');
  }

  let now = 0;
  let lastReactionAt = Number.NEGATIVE_INFINITY;
  let clickTimes: number[] = [];
  let lastSlipAt = Number.NEGATIVE_INFINITY;

  return {
    update(stepMs) {
      now += stepMs;
    },

    hover() {
      if (now - lastReactionAt < petCooldownMs) return undefined;
      lastReactionAt = now;
      return 'pet';
    },

    click() {
      // Keep only clicks inside the window, then add this one.
      clickTimes = clickTimes.filter((time) => now - time < dizzyWindowMs);
      clickTimes.push(now);
      if (clickTimes.length < dizzyClicks) return undefined;
      clickTimes = [];
      lastReactionAt = now;
      return 'dizzy';
    },

    spaceChanged() {
      if (now - lastSlipAt < slipCooldownMs) return undefined;
      lastSlipAt = now;
      lastReactionAt = now; // no hop right on top of the slip
      return 'slip';
    },
  };
}
