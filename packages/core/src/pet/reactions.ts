/** How Mocha responds to direct interaction. "tower" opens Mocha's home. */
export type Reaction = 'pet' | 'dizzy' | 'slip' | 'tower';

export interface ReactionOptions {
  /** Minimum time between two petting reactions. */
  petCooldownMs?: number;
  /** Clicks within `dizzyWindowMs` that make Mocha dizzy. */
  dizzyClicks?: number;
  dizzyWindowMs?: number;
  /** Two clicks at most this far apart are a double click. */
  doubleClickMs?: number;
  /**
   * How long a double click waits for a third click before it opens the
   * Tower: a third click means the user is on the way to four, and dizzy.
   */
  towerDelayMs?: number;
  /** Minimum time between two slips when the user switches Spaces. */
  slipCooldownMs?: number;
}

export interface ReactionDetector {
  /** Advances the detector's clock; returns "tower" when a double click has settled. */
  update(stepMs: number): Reaction | undefined;
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
 * - a double click opens the Tower, but only once no third click followed
 *   within a short delay, so clicking towards dizzy never opens it
 * - switching Spaces makes it slip, at most once per cooldown, so a series
 *   of swipes is one stumble, not a chain of them
 *
 * Time comes from update(), so behavior is deterministic and testable.
 */
export function createReactionDetector({
  petCooldownMs = 1_500,
  dizzyClicks = 4,
  dizzyWindowMs = 1_500,
  doubleClickMs = 400,
  towerDelayMs = 350,
  slipCooldownMs = 1_500,
}: ReactionOptions = {}): ReactionDetector {
  if (
    !(petCooldownMs >= 0) ||
    !(dizzyClicks >= 3) ||
    !(dizzyWindowMs > 0) ||
    !(doubleClickMs > 0) ||
    !(towerDelayMs > 0) ||
    !(slipCooldownMs >= 0)
  ) {
    throw new RangeError('invalid reaction options');
  }

  let now = 0;
  let lastReactionAt = Number.NEGATIVE_INFINITY;
  let clickTimes: number[] = [];
  let lastClickAt = Number.NEGATIVE_INFINITY;
  /** When a double click opens the Tower, unless a third click comes first. */
  let towerAt: number | undefined;
  let lastSlipAt = Number.NEGATIVE_INFINITY;

  const forgetClicks = () => {
    clickTimes = [];
    lastClickAt = Number.NEGATIVE_INFINITY;
    towerAt = undefined;
  };

  return {
    update(stepMs) {
      now += stepMs;
      if (towerAt === undefined || now < towerAt) return undefined;
      forgetClicks(); // these clicks opened the Tower; they do not count towards dizzy
      return 'tower';
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
      if (clickTimes.length >= dizzyClicks) {
        forgetClicks();
        lastReactionAt = now;
        return 'dizzy';
      }
      if (towerAt !== undefined) {
        towerAt = undefined; // a third click: heading for dizzy, not the Tower
      } else if (now - lastClickAt <= doubleClickMs) {
        towerAt = now + towerDelayMs;
      }
      lastClickAt = now;
      return undefined;
    },

    spaceChanged() {
      if (now - lastSlipAt < slipCooldownMs) return undefined;
      lastSlipAt = now;
      lastReactionAt = now; // no hop right on top of the slip
      return 'slip';
    },
  };
}
