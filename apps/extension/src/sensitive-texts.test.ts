import { SENSITIVE_DOMAINS } from '@mocha/core';
import { describe, expect, it } from 'vitest';
import { SENSITIVE_KIND_LABELS } from './sensitive-texts.ts';

describe('SENSITIVE_KIND_LABELS', () => {
  it('names every sensitive list the options page shows', () => {
    expect(Object.keys(SENSITIVE_KIND_LABELS).sort()).toEqual(
      Object.keys(SENSITIVE_DOMAINS).sort(),
    );
  });
});
