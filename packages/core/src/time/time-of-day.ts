/** The part of the day Mocha's Tower shows through its window. */
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

const HOUR = 60;

/**
 * The part of the day at `minute` after local midnight: dawn from 6:00,
 * day from 8:00, dusk from 17:00 and night from 20:00. Fixed hours keep it
 * simple and private: no location is needed to work out a sunrise.
 */
export function timeOfDay(minute: number): TimeOfDay {
  if (minute >= 20 * HOUR || minute < 6 * HOUR) return 'night';
  if (minute < 8 * HOUR) return 'dawn';
  if (minute < 17 * HOUR) return 'day';
  return 'dusk';
}
