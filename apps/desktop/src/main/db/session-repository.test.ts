import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, runMigrations } from './migrations.ts';
import { createSessionRepository, type SessionRepository } from './session-repository.ts';

describe('createSessionRepository', () => {
  let sessions: SessionRepository;

  beforeEach(() => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db, MIGRATIONS);
    sessions = createSessionRepository(db);
  });

  it('stores a session and ends it', () => {
    const id = sessions.start('work', 100);
    sessions.end(id, 200);

    expect(sessions.overlapping(0, 1_000)).toEqual([
      { id, kind: 'work', startedAt: 100, endedAt: 200 },
    ]);
  });

  it('includes sessions that are still open', () => {
    const id = sessions.start('break', 100);

    expect(sessions.overlapping(500, 600)).toEqual([
      { id, kind: 'break', startedAt: 100, endedAt: null },
    ]);
  });

  it('returns only sessions overlapping the range, oldest first', () => {
    const before = sessions.start('work', 0);
    sessions.end(before, 100);
    const crossing = sessions.start('work', 150);
    sessions.end(crossing, 250);
    const inside = sessions.start('break', 250);
    sessions.end(inside, 300);
    const after = sessions.start('work', 400);
    sessions.end(after, 500);

    expect(sessions.overlapping(200, 400).map(({ id }) => id)).toEqual([crossing, inside]);
  });

  it('treats a hostile value as data, not SQL', () => {
    const hostile = "work'); DROP TABLE sessions; --";

    expect(() => sessions.start(hostile as 'work', 1)).toThrow(); // CHECK constraint
    expect(sessions.overlapping(0, 10)).toEqual([]); // the table still exists
  });

  it('refuses an end before the start', () => {
    const id = sessions.start('work', 100);

    expect(() => sessions.end(id, 50)).toThrow();
  });
});
