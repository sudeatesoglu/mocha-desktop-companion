/**
 * Passes a value on only when it differs from the last one passed on.
 * After reset() the next value is always passed on, so a receiver that may
 * hold a stale value (for example after a pause) is brought up to date.
 */
export function createChangeReporter<T>(send: (value: T) => void) {
  let hasLast = false;
  let last: T | undefined;
  return {
    report(value: T): void {
      if (hasLast && Object.is(value, last)) return;
      hasLast = true;
      last = value;
      send(value);
    },
    reset(): void {
      hasLast = false;
      last = undefined;
    },
  };
}
