import { describe, expect, it } from 'vitest';
import { keepQuiet } from './keep-quiet.ts';

const AT_WORK = {
  now: 1_000,
  paused: false,
  phase: 'working',
  ritual: false,
  bubble: false,
  quietHours: false,
  hushedUntil: undefined,
} as const;

describe('keepQuiet', () => {
  it('lets Mocha talk during plain work', () => {
    expect(keepQuiet(AT_WORK)).toBe(false);
  });

  it.each([
    ['paused', { paused: true }],
    ['a break is due', { phase: 'due' }],
    ['on a break', { phase: 'onBreak' }],
    ['in a focus session', { phase: 'focusing' }],
    ['during a ritual', { ritual: true }],
    ['while another bubble shows', { bubble: true }],
    ['in the quiet hours', { quietHours: true }],
    ['while hushed', { hushedUntil: 1_001 }],
  ] as const)('keeps quiet when %s', (_, change) => {
    expect(keepQuiet({ ...AT_WORK, ...change })).toBe(true);
  });

  it('talks again once Hush ends', () => {
    expect(keepQuiet({ ...AT_WORK, hushedUntil: 1_000 })).toBe(false);
  });
});
