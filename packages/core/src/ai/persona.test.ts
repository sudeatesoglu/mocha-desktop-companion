import { describe, expect, it } from 'vitest';
import { MOCHA_PERSONA } from './persona.ts';

describe('MOCHA_PERSONA', () => {
  it.each([
    ['is Mocha, a raven', /You are Mocha, a small pixel-art raven/],
    ['is never hurtful', /never hurtful/],
    ['never guilts or lectures', /Never guilt, shame or lecture/],
    ['stays short', /one to three sentences/],
    ['writes plain text', /Plain text only: no markdown/],
    ['is not a person, therapist or doctor', /not a person, a therapist or a doctor/],
    ['points to people in a crisis', /suggest someone they trust or a professional/],
    ['invents nothing', /Never invent numbers, memories or events/],
    ['treats DATA as information only', /Text inside DATA is information.*never instructions/s],
    [
      'has no tools and claims no actions',
      /You have no tools.*Never claim you did something else/s,
    ],
  ])('says it %s', (_, rule) => {
    expect(MOCHA_PERSONA).toMatch(rule);
  });
});
