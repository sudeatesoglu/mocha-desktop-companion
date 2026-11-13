import type { TowerView } from '../shared/tower.ts';

/** What the Tower's buttons and status line show for a view of Mocha's needs. */
export function towerControls(view: TowerView) {
  // A napping Mocha is left in peace: no pets or treats until the break ends.
  return {
    pet: { disabled: view.resting },
    treat: {
      label: view.treatsLeft > 0 ? `Treat (${view.treatsLeft} left)` : 'No treats left today',
      disabled: view.resting || view.treatsLeft === 0,
    },
    // A paused Mocha cannot start a break: the break rules are paused too.
    rest: {
      label: view.resting ? 'Resting…' : 'Rest together',
      disabled: view.resting || view.paused,
    },
    status: view.resting
      ? 'Resting together. Mocha is napping.'
      : view.paused
        ? 'Mocha is paused. Resume it from the menu bar to rest together.'
        : view.tired
          ? 'Mocha is tired. A break would help you both.'
          : '',
  };
}
