import { type BreakState, type SessionKind, sessionBoundary, sessionKind } from '@mocha/core';
import type { SessionRepository } from '../db/session-repository.ts';

export interface SessionRecorder {
  /** Closes sessions a crash left open, then starts one for `state`. */
  begin(state: BreakState, now: number): void;
  /** Ends and starts sessions as the break state changes. */
  record(previous: BreakState, next: BreakState, now: number): void;
  /** Notes that the open session is still going, for crash recovery. */
  heartbeat(now: number): void;
  /** Ends the open session, on quit. */
  finish(now: number): void;
}

/** How often the open session is marked alive: the most a crash can lose. */
export const SESSION_HEARTBEAT_MS = 60_000;

/**
 * Turns break state changes into stored work and break sessions. Only kinds
 * and timestamps are written. Recording is best effort: a database error is
 * logged and never stops Mocha.
 */
export function createSessionRecorder(
  sessions: SessionRepository,
  logger: { warn(message: string, details?: unknown): void },
): SessionRecorder {
  let current: { id: number; startedAt: number } | undefined;

  const safely = (action: () => void) => {
    try {
      action();
    } catch (error) {
      logger.warn('[db] could not record a session', error);
    }
  };

  function switchTo(kind: SessionKind | undefined, at: number): void {
    if (current) {
      const { id, startedAt } = current;
      current = undefined;
      // The clock may have been set back; a session never ends before it starts.
      safely(() => sessions.end(id, Math.max(at, startedAt)));
    }
    if (kind) {
      safely(() => {
        current = { id: sessions.start(kind, at), startedAt: at };
      });
    }
  }

  return {
    begin(state, now) {
      safely(() => {
        const closed = sessions.closeAbandoned();
        if (closed > 0) logger.warn(`[db] closed ${closed} session(s) left open by a crash`);
      });
      switchTo(sessionKind(state), now);
    },
    record(previous, next, now) {
      const boundary = sessionBoundary(previous, next, now);
      if (boundary) switchTo(boundary.kind, boundary.at);
    },
    heartbeat(now) {
      const open = current;
      if (open) safely(() => sessions.touch(open.id, now));
    },
    finish(now) {
      switchTo(undefined, now);
    },
  };
}
