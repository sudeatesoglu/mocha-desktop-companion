const SECOND_MS = 1_000;

/** How Mocha acts along with a ritual step; the names of skin animations. */
export type RitualPose =
  | 'breathe'
  | 'lookFar'
  | 'slowBlink'
  | 'shoulderRoll'
  | 'reachUp'
  | 'leanLeft'
  | 'leanRight'
  | 'tiltLeft'
  | 'tiltRight'
  | 'flutter';

export type RitualId = 'breathe' | 'eyes' | 'stretch';

export interface RitualStep {
  /** What the user does now, shown in the bubble. */
  readonly text: string;
  readonly durationMs: number;
  /** What Mocha does meanwhile on the desktop. */
  readonly pose: RitualPose;
}

export interface Ritual {
  readonly id: RitualId;
  /** The button label that starts it. */
  readonly title: string;
  readonly steps: readonly RitualStep[];
}

const step = (text: string, seconds: number, pose: RitualPose): RitualStep => ({
  text,
  durationMs: seconds * SECOND_MS,
  pose,
});

// Box breathing: four rounds of in, hold, out, hold, four seconds each.
// Mocha's "breathe" animation loops with the same 16-second rhythm and
// keeps running from step to step, so starting both together keeps them
// in step.
const BOX: readonly RitualStep[] = [
  step('Breathe in', 4, 'breathe'),
  step('Hold', 4, 'breathe'),
  step('Breathe out', 4, 'breathe'),
  step('Hold', 4, 'breathe'),
];

/** The rituals Mocha offers during a break, in the order it offers them. */
export const RITUALS: readonly Ritual[] = Object.freeze([
  { id: 'breathe', title: 'Breathe', steps: [...BOX, ...BOX, ...BOX, ...BOX] },
  {
    id: 'eyes',
    title: 'Rest eyes',
    // The 20-20-20 rule: every 20 minutes, 20 seconds at something 20 feet away.
    steps: [
      step('Look at something far away, at least 6 metres off', 20, 'lookFar'),
      step('Blink slowly', 5, 'slowBlink'),
    ],
  },
  {
    id: 'stretch',
    title: 'Stretch',
    // Mocha faces left, so its left and right are the screen's.
    steps: [
      step('Roll your shoulders back', 10, 'shoulderRoll'),
      step('Reach both arms up high', 10, 'reachUp'),
      step('Lean slowly to the left', 8, 'leanLeft'),
      step('And slowly to the right', 8, 'leanRight'),
      step('Tilt your head to the left', 8, 'tiltLeft'),
      step('And to the right', 8, 'tiltRight'),
      step('Roll your wrists slowly', 6, 'flutter'),
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
