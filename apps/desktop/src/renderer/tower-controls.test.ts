import { BARE_LOOK } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import type { TowerFinds, TowerView } from '../shared/tower.ts';
import { towerControls } from './tower-controls.ts';

const view = (patch: Partial<TowerView>): TowerView => ({
  mood: 60,
  energy: 80,
  tired: false,
  treatsLeft: 3,
  paused: false,
  breakMinutesLeft: null,
  focusMinutesLeft: null,
  finds: finds({}),
  look: BARE_LOOK,
  wardrobe: { items: [], toFind: 5 },
  ...patch,
});

function finds(patch: Partial<TowerFinds>): TowerFinds {
  return {
    points: 1,
    pointsPerFind: 3,
    waiting: false,
    complete: false,
    found: 2,
    total: 11,
    latest: 'Fern',
    ...patch,
  };
}

describe('towerControls', () => {
  it('offers everything to a rested Mocha', () => {
    expect(towerControls(view({}))).toEqual({
      pet: { disabled: false },
      treat: { label: 'Treat (3 left)', disabled: false },
      rest: { action: 'rest', label: 'Rest together', disabled: false },
      focus: { running: false, label: 'Focus with Mocha', disabled: false },
      finds: {
        dots: '●○○',
        dotsLabel: '1 of 3 points toward the next find',
        text: '2 of 11 found, last: Fern',
      },
      wardrobe: { rows: [], note: 'Nothing to wear yet. Mocha finds things during breaks.' },
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

  it('leaves a napping Mocha in peace during a break, and offers to end it', () => {
    const controls = towerControls(view({ breakMinutesLeft: 8, tired: true }));

    expect(controls.pet.disabled).toBe(true);
    expect(controls.treat.disabled).toBe(true);
    expect(controls.rest).toEqual({ action: 'endBreak', label: 'End break', disabled: false });
    expect(controls.status).toBe('Resting together: 8 min left. Mocha is napping.');
  });

  it('shows no minutes once a break goes on while the user is away', () => {
    expect(towerControls(view({ breakMinutesLeft: 0 })).status).toBe(
      'Resting together. Mocha is napping.',
    );
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

  it('counts what was found before the first find has a name', () => {
    expect(towerControls(view({ finds: finds({ found: 0, latest: null }) })).finds.text).toBe(
      '0 of 11 found',
    );
  });

  it('says when the meter waits for tomorrow', () => {
    expect(towerControls(view({ finds: finds({ points: 3, waiting: true }) })).finds).toEqual({
      dots: '●●●',
      dotsLabel: '3 of 3 points toward the next find',
      text: 'Mocha looks again tomorrow',
    });
  });

  it('hides the meter once everything is found', () => {
    expect(towerControls(view({ finds: finds({ complete: true, points: 0 }) })).finds).toEqual({
      dots: '',
      dotsLabel: '',
      text: 'All 11 found',
    });
  });

  it('offers to wear what Mocha found, and to take off what it wears', () => {
    const wardrobe = {
      items: [
        { id: 'redScarf', title: 'Red scarf', slot: 'neck', worn: true },
        { id: 'hatFeather', title: 'Hat feather', slot: 'hat', worn: false },
      ],
      toFind: 3,
    } as const;

    expect(
      towerControls(view({ wardrobe: { ...wardrobe, items: [...wardrobe.items] } })).wardrobe,
    ).toEqual({
      rows: [
        {
          id: 'redScarf',
          title: 'Red scarf',
          label: 'Take off',
          request: { slot: 'neck', id: null },
        },
        {
          id: 'hatFeather',
          title: 'Hat feather',
          label: 'Wear',
          request: { slot: 'hat', id: 'hatFeather' },
        },
      ],
      note: '3 more to find',
    });
  });

  it('says when every accessory is found', () => {
    const items = [{ id: 'bowTie', title: 'Bow tie', slot: 'neck', worn: false } as const];

    expect(towerControls(view({ wardrobe: { items, toFind: 0 } })).wardrobe.note).toBe(
      'Everything to wear is found.',
    );
  });
});
