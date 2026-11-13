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
    rest: { label: view.resting ? 'Resting…' : 'Rest together', disabled: view.resting },
    status: view.resting
      ? 'Resting together. Mocha is napping.'
      : view.tired
        ? 'Mocha is tired. A break would help you both.'
        : '',
  };
}
