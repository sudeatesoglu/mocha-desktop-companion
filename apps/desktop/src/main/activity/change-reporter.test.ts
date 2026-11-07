import { describe, expect, it, vi } from 'vitest';
import { createChangeReporter } from './change-reporter.ts';

describe('createChangeReporter', () => {
  it('passes on the first value and then only changes', () => {
    const send = vi.fn();
    const reporter = createChangeReporter<boolean>(send);

    for (const value of [false, false, true, true, false]) reporter.report(value);

    expect(send.mock.calls).toEqual([[false], [true], [false]]);
  });

  it('passes on the next value after a reset, even if it did not change', () => {
    const send = vi.fn();
    const reporter = createChangeReporter<boolean>(send);
    reporter.report(false);

    reporter.reset();
    reporter.report(false);

    expect(send.mock.calls).toEqual([[false], [false]]);
  });
});
