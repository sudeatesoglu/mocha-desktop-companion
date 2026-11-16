/** The flame's frames in a loop: uneven, so it does not tick like a clock. */
const PATTERN = [0, 0, 1, 0, 1, 1, 0, 1] as const;

/**
 * A candle flame's frame. It moves on every `frameMs` while lit and stands
 * still otherwise, so a candle that is out costs no redraws.
 */
export function createFlicker(frameMs = 250) {
  let elapsedMs = 0;
  let step = 0;
  return {
    get frame(): number {
      // `step` wraps at the pattern's length; TypeScript cannot see that.
      return PATTERN[step] as number;
    },
    /** Advances while `lit`; returns true when the flame looks different. */
    update(stepMs: number, lit: boolean): boolean {
      if (!lit) return false;
      elapsedMs += stepMs;
      let changed = false;
      while (elapsedMs >= frameMs) {
        elapsedMs -= frameMs;
        const before = PATTERN[step];
        step = (step + 1) % PATTERN.length;
        if (PATTERN[step] !== before) changed = true;
      }
      return changed;
    },
  };
}
