const SECOND_MS = 1_000;

/** How Mocha acts along during a ritual; the names of skin animations. */
export type RitualPose = 'breathe' | 'lookFar' | 'stretch';

export type RitualId = 'breathe' | 'eyes' | 'stretch';

export interface RitualStep {
  /** What the user does now, shown in the bubble. */
  readonly text: string;
  readonly durationMs: number;
}

export interface Ritual {
  readonly id: RitualId;
  /** The button label that starts it. */
  readonly title: string;
  readonly pose: RitualPose;
  readonly steps: readonly RitualStep[];
}

const step = (text: string, seconds: number): RitualStep => ({
  text,
  durationMs: seconds * SECOND_MS,
});

// Box breathing: four rounds of in, hold, out, hold, four seconds each.
// Mocha's "breathe" animation loops with the same 16-second rhythm, so
// starting both together keeps them in step.
const BOX: readonly RitualStep[] = [
  step('Breathe in', 4),
  step('Hold', 4),
  step('Breathe out', 4),
  step('Hold', 4),
];

/** The rituals Mocha offers during a break, in the order it offers them. */
export const RITUALS: readonly Ritual[] = Object.freeze([
  { id: 'breathe', title: 'Breathe', pose: 'breathe', steps: [...BOX, ...BOX, ...BOX, ...BOX] },
  {
    id: 'eyes',
    title: 'Rest eyes',
    pose: 'lookFar',
    // The 20-20-20 rule: every 20 minutes, 20 seconds at something 20 feet away.
    steps: [step('Look at something far away, at least 6 metres off', 20), step('Blink slowly', 5)],
  },
  {
    id: 'stretch',
    title: 'Stretch',
    pose: 'stretch',
    steps: [
      step('Roll your shoulders back', 10),
      step('Reach both arms up high', 10),
      step('Lean slowly to the left', 8),
      step('And slowly to the right', 8),
      step('Tilt your head to one side', 8),
      step('And to the other side', 8),
      step('Shake out your hands', 6),
    ],
  },
]);

/** A ritual by its id. */
export function ritualById(id: RitualId): Ritual {
  const found = RITUALS.find((ritual) => ritual.id === id);
  if (!found) throw new Error(`unknown ritual "${id}"`);
  return found;
}

/** How long a ritual takes from start to finish. */
export function ritualDuration(ritual: Ritual): number {
  return ritual.steps.reduce((total, { durationMs }) => total + durationMs, 0);
}

export type RitualProgress =
  | {
      readonly finished: false;
      readonly step: RitualStep;
      readonly stepIndex: number;
      /** Time left in this step, for the countdown. */
      readonly stepLeftMs: number;
      readonly totalLeftMs: number;
    }
  | { readonly finished: true };

/**
 * Where a ritual stands `elapsedMs` after it started: a pure function of
 * time, like the break rules, so the bubble only needs a clock.
 */
export function ritualProgress(ritual: Ritual, elapsedMs: number): RitualProgress {
  let start = 0;
  const elapsed = Math.max(0, elapsedMs);
  const total = ritualDuration(ritual);
  for (const [stepIndex, current] of ritual.steps.entries()) {
    const end = start + current.durationMs;
    if (elapsed < end) {
      return {
        finished: false,
        step: current,
        stepIndex,
        stepLeftMs: end - elapsed,
        totalLeftMs: total - elapsed,
      };
    }
    start = end;
  }
  return { finished: true };
}
