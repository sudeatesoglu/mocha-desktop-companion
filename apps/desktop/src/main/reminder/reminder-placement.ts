import type { ReminderSide } from '../../shared/reminder.ts';
import type { Rect } from '../windows/overlay-window-options.ts';

/** How far the bubble overlaps Mocha's window, so it starts at the beak. */
const OVERLAP = 12;
/** Bubble top below the top of Mocha's window: level with the head. */
const DROP = 8;

/**
 * Where the reminder bubble goes: to the left of Mocha, in front of its beak
 * (Mocha faces left), or to the right if there is no room on the left;
 * always fully inside the work area.
 */
export function reminderPosition(
  mocha: Rect,
  size: { width: number; height: number },
  workArea: Rect,
): { x: number; y: number; side: ReminderSide } {
  const left = mocha.x - size.width + OVERLAP;
  const right = mocha.x + mocha.width - OVERLAP;
  const fitsLeft = left >= workArea.x;
  const x = fitsLeft ? left : Math.min(right, workArea.x + workArea.width - size.width);
  const y = Math.min(
    Math.max(mocha.y + DROP, workArea.y),
    workArea.y + workArea.height - size.height,
  );
  return { x: Math.max(x, workArea.x), y, side: fitsLeft ? 'left' : 'right' };
}
