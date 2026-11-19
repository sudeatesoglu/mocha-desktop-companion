import { BROWSER_CAPABILITIES } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { CAPABILITY_TEXTS } from './browser.ts';

describe('CAPABILITY_TEXTS', () => {
  it('explains every capability exactly once, so Settings can offer each', () => {
    expect(CAPABILITY_TEXTS.map(({ name }) => name).sort()).toEqual(
      [...BROWSER_CAPABILITIES].sort(),
    );
  });

  it('lists what Mocha may know before what it may do', () => {
    const order = CAPABILITY_TEXTS.map(({ name }) => name);

    expect(order.indexOf('talk')).toBeGreaterThan(order.indexOf('pageActivity'));
    expect(order.indexOf('nudge')).toBeGreaterThan(order.indexOf('pageActivity'));
  });

  it('warns about Chrome’s broad permission where it is needed', () => {
    const pageActivity = CAPABILITY_TEXTS.find(({ name }) => name === 'pageActivity');

    expect(pageActivity?.hint).toContain('Never what you type');
    expect(pageActivity?.hint).toContain('Chrome will ask for access to all sites');
  });
});
