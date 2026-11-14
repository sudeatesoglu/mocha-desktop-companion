import { describe, expect, it } from 'vitest';
import type { TowerView } from '../shared/tower.ts';
import { towerControls } from './tower-controls.ts';

const view = (patch: Partial<TowerView>): TowerView => ({
  mood: 60,
  energy: 80,
  tired: false,
  treatsLeft: 3,
  resting: false,
  paused: false,
  focusMinutesLeft: null,
  ...patch,
});

describe('towerControls', () => {
  it('offers everything to a rested Mocha', () => {
    expect(towerControls(view({}))).toEqual({
      pet: { disabled: false },
      treat: { label: 'Treat (3 left)', disabled: false },
      rest: { label: 'Rest together', disabled: false },
      focus: { running: false, label: 'Focus with Mocha', disabled: false },
      status: '',
    });
  });

  it('says when the treats for today are gone', () => {
    expect(towerControls(view({ treatsLeft: 0 })).treat).toEqual({
      label: 'No treats left today',
      disabled: true,
    });
  });

  it('suggests a break when Mocha is tired', () => {
    expect(towerControls(view({ tired: true })).status).toBe(
      'Mocha is tired. A break would help you both.',
    );
  });

  it('does not offer to rest together while Mocha is paused', () => {
    const controls = towerControls(view({ paused: true, tired: true }));

    expect(controls.rest.disabled).toBe(true);
    expect(controls.status).toBe('Mocha is paused. Resume it from the menu bar to rest together.');
  });

  it('leaves a napping Mocha in peace during a break', () => {
    const controls = towerControls(view({ resting: true, tired: true }));

    expect(controls.pet.disabled).toBe(true);
    expect(controls.treat.disabled).toBe(true);
    expect(controls.rest).toEqual({ label: 'Resting…', disabled: true });
    expect(controls.status).toBe('Resting together. Mocha is napping.');
  });

  it('shows the minutes left in a focus session and Mocha reading', () => {
    const controls = towerControls(view({ focusMinutesLeft: 18, tired: true }));

    expect(controls.focus).toEqual({
      running: true,
      label: 'Focusing: 18 min left',
      disabled: false,
    });
    expect(controls.status).toBe('Focusing together. Mocha is reading next to you.');
  });

  it('starts no focus session while Mocha is paused', () => {
    expect(towerControls(view({ paused: true })).focus.disabled).toBe(true);
  });
});
