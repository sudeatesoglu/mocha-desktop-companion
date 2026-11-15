import { type Ritual, ritualDuration, ritualProgress } from '@mocha/core';

export type RitualScreen =
  | {
      readonly kind: 'step';
      readonly title: string;
      /** What to do now. */
      readonly text: string;
      /** Whole seconds left in this step, for the countdown. */
      readonly seconds: number;
      /** How far the whole ritual is, from 0 to 1. */
      readonly progress: number;
    }
  | { readonly kind: 'done' };

/** What the bubble shows `elapsedMs` into a ritual. */
export function ritualScreen(ritual: Ritual, elapsedMs: number): RitualScreen {
  const at = ritualProgress(ritual, elapsedMs);
  if (at.finished) return { kind: 'done' };
  const total = ritualDuration(ritual);
  return {
    kind: 'step',
    title: ritual.title,
    text: at.step.text,
    seconds: Math.ceil(at.stepLeftMs / 1_000),
    progress: (total - at.totalLeftMs) / total,
  };
}
