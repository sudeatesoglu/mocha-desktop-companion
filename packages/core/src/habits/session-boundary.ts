import type { BreakState } from './break-machine.ts';

export type SessionKind = 'work' | 'break';

/** The kind of session a break state belongs to; none while paused. */
export function sessionKind(state: BreakState): SessionKind | undefined {
  switch (state.phase) {
    case 'working':
    case 'due':
      return 'work';
    case 'onBreak':
      return 'break';
    case 'paused':
      return undefined;
  }
}

/**
 * Where one session ends and the next begins when the break state changes:
 * at `at`, the current session (if any) ends and one of `kind` (if any)
 * starts. Undefined while the kind stays the same, so a snooze or a
 * dismissed reminder keeps one continuous work session.
 *
 * A break the user walked into starts when input stopped (`startedAt`), not
 * when it was noticed, so the work session ends there too.
 */
export function sessionBoundary(
  previous: BreakState,
  next: BreakState,
  now: number,
): { at: number; kind: SessionKind | undefined } | undefined {
  const kind = sessionKind(next);
  if (kind === sessionKind(previous)) return undefined;
  switch (next.phase) {
    case 'onBreak':
      return { at: next.startedAt, kind };
    case 'paused':
      return { at: now, kind };
    default:
      return { at: next.workStartedAt, kind };
  }
}
