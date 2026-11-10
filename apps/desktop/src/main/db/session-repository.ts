import type { DatabaseSync } from 'node:sqlite';
import type { SessionKind } from '@mocha/core';

export interface Session {
  id: number;
  kind: SessionKind;
  startedAt: number;
  endedAt: number | null;
}

/**
 * Reads and writes work and break sessions. Values always go through bound
 * parameters, never into the SQL text. Times are ms since the epoch.
 */
export function createSessionRepository(db: DatabaseSync) {
  const insert = db.prepare('INSERT INTO sessions (kind, started_at) VALUES (?, ?)');
  const finish = db.prepare('UPDATE sessions SET ended_at = ? WHERE id = ?');
  const seen = db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?');
  const closeOpen = db.prepare(`
    UPDATE sessions SET ended_at = MAX(started_at, COALESCE(last_seen_at, started_at))
    WHERE ended_at IS NULL
  `);
  const overlapping = db.prepare(`
    SELECT id, kind, started_at AS startedAt, ended_at AS endedAt
    FROM sessions
    WHERE started_at < ? AND (ended_at IS NULL OR ended_at > ?)
    ORDER BY started_at
  `);

  return {
    /** Starts a session and returns its id. */
    start(kind: SessionKind, at: number): number {
      return Number(insert.run(kind, at).lastInsertRowid);
    },
    end(id: number, at: number): void {
      finish.run(at, id);
    },
    /** Records that the open session `id` was still going at `at`. */
    touch(id: number, at: number): void {
      seen.run(at, id);
    },
    /**
     * Ends sessions a crash or forced quit left open, at the last time they
     * were seen alive, and returns how many there were.
     */
    closeAbandoned(): number {
      return Number(closeOpen.run().changes);
    },
    /** Sessions overlapping [from, to), including ones still open. */
    overlapping(from: number, to: number): Session[] {
      return overlapping.all(to, from) as unknown as Session[];
    },
  };
}

export type SessionRepository = ReturnType<typeof createSessionRepository>;
