import type { AccessorySlot, DecorSlot } from '@mocha/core';
import type { TowerAction, TowerFinds, TowerView } from '../shared/tower.ts';

/** What the Tower's buttons and status line show for a view of Mocha's needs. */
export function towerControls(view: TowerView) {
  const resting = view.breakMinutesLeft !== null;
  // During a break the rest button ends it, like a stopwatch's start and
  // stop. A paused Mocha cannot start a break: the break rules are paused too.
  const rest: { action: TowerAction; label: string; disabled: boolean } = resting
    ? { action: 'endBreak', label: 'End break', disabled: false }
    : { action: 'rest', label: 'Rest together', disabled: view.paused };
  // A napping Mocha is left in peace: no pets or treats until the break ends.
  return {
    pet: { disabled: resting },
    treat: {
      label: view.treatsLeft > 0 ? `Treat (${view.treatsLeft} left)` : 'No treats left today',
      disabled: resting || view.treatsLeft === 0,
    },
    rest,
    // While a session runs, the lengths give way to the time left and "End".
    focus: {
      running: view.focusMinutesLeft !== null,
      label:
        view.focusMinutesLeft === null
          ? 'Focus with Mocha'
          : `Focusing: ${view.focusMinutesLeft} min left`,
      // The break rules are paused too: no session can start.
      disabled: view.paused,
    },
    finds: findsControls(view.finds),
    wardrobe: wardrobeControls(view.wardrobe),
    room: roomControls(view.decor),
    status: resting
      ? restingStatus(view.breakMinutesLeft)
      : view.paused
        ? 'Mocha is paused. Resume it from the menu bar to rest together.'
        : view.focusMinutesLeft !== null
          ? 'Focusing together. Mocha is reading next to you.'
          : view.tired
            ? 'Mocha is tired. A break would help you both.'
            : '',
  };
}

/** The break's minutes left; none once its length is over and the user is away. */
function restingStatus(minutesLeft: number | null): string {
  return minutesLeft
    ? `Resting together: ${minutesLeft} min left. Mocha is napping.`
    : 'Resting together. Mocha is napping.';
}

/** The find meter's dots, their spoken label and the line beside them (ADR-0010). */
function findsControls(finds: TowerFinds) {
  if (finds.complete) return { dots: '', dotsLabel: '', text: `All ${finds.total} found` };
  const latest = finds.latest ? `, last: ${finds.latest}` : '';
  return {
    dots: '●'.repeat(finds.points) + '○'.repeat(finds.pointsPerFind - finds.points),
    dotsLabel: `${finds.points} of ${finds.pointsPerFind} points toward the next find`,
    text: finds.waiting
      ? 'Mocha looks again tomorrow'
      : `${finds.found} of ${finds.total} found${latest}`,
  };
}

/** How the Collection view names each slot. */
const SLOT_NAMES: Record<AccessorySlot | DecorSlot, string> = {
  neck: 'Neck',
  hat: 'Hat',
  shelf: 'Shelf',
  wall: 'Wall',
  floor: 'Floor',
  sill: 'Window sill',
};

/** The line under a list: nothing found yet, how many are left, or all found. */
function collectionNote(found: number, toFind: number, empty: string, complete: string) {
  if (found === 0) return empty;
  return toFind > 0 ? `${toFind} more to find` : complete;
}

/**
 * The Collection view's Wear list: each found accessory with the button
 * that puts it on, or takes it off when worn.
 */
function wardrobeControls({ items, toFind }: TowerView['wardrobe']) {
  return {
    rows: items.map(({ id, title, slot, worn }) => ({
      id,
      title,
      where: SLOT_NAMES[slot],
      label: worn ? 'Take off' : 'Wear',
      request: { slot, id: worn ? null : id },
    })),
    note: collectionNote(
      items.length,
      toFind,
      'Nothing to wear yet. Mocha finds things during breaks.',
      'Everything to wear is found.',
    ),
  };
}

/**
 * The Collection view's Room list: each found decor item with the button
 * that places it in its slot, replacing what stood there, or removes it.
 */
function roomControls({ items, toFind }: TowerView['decor']) {
  return {
    rows: items.map(({ id, title, slot, placed }) => ({
      id,
      title,
      where: SLOT_NAMES[slot],
      label: placed ? 'Remove' : 'Place',
      request: { slot, id: placed ? null : id },
    })),
    note: collectionNote(
      items.length,
      toFind,
      'No decor yet. Mocha finds things during breaks.',
      'Every decor item is found.',
    ),
  };
}
