import type { ReminderSide } from './reminder.ts';

/** Size of the ritual bubble in screen pixels. */
export const RITUAL_WIDTH = 264;
export const RITUAL_HEIGHT = 140;

/** Main → ritual: which side of Mocha the bubble sits on; its tail points at Mocha. */
export interface RitualShow {
  side: ReminderSide;
}
