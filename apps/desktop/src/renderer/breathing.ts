/** How long Mocha stays in each breathing pose. */
export const BREATH_HALF_PERIOD_MS = 800;

/**
 * Vertical offset in sprite pixels for the placeholder's idle breathing:
 * 0 (inhale) and 1 (exhale), alternating every half period.
 *
 * Placeholder until sprite animations from skins replace it (#21).
 */
export function breathOffset(elapsedMs: number, halfPeriodMs = BREATH_HALF_PERIOD_MS): 0 | 1 {
  return Math.floor(elapsedMs / halfPeriodMs) % 2 === 0 ? 0 : 1;
}
