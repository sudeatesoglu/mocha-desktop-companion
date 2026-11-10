import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { type BreakState, startWorking } from '@mocha/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MIGRATIONS, runMigrations } from '../db/migrations.ts';
import { openDatabase } from '../db/open-database.ts';
import { createSessionRepository, type SessionRepository } from '../db/session-repository.ts';
import { createSessionRecorder } from './session-recorder.ts';

const onBreak = (startedAt: number): BreakState => ({
  phase: 'onBreak',
  startedAt,
  endsAt: startedAt + 5,
  workStartedAt: 0,
});
const due: BreakState = { phase: 'due', workStartedAt: 0, dueAt: 50 };
const paused: BreakState = { phase: 'paused' };

describe('createSessionRecorder', () => {
  const logger = { warn: vi.fn() };
  let sessions: SessionRepository;
  const stored = () =>
    sessions.overlapping(0, Number.MAX_SAFE_INTEGER).map(({ kind, startedAt, endedAt }) => ({
      kind,
      startedAt,
      endedAt,
    }));

  beforeEach(() => {
    logger.warn.mockClear();
    const db = new DatabaseSync(':memory:');
    runMigrations(db, MIGRATIONS);
    sessions = createSessionRepository(db);
  });

  it('records work, a break where it began, and work again', () => {
    const recorder = createSessionRecorder(sessions, logger);
    recorder.begin(startWorking(0), 0);

    recorder.record(startWorking(0), due, 50);
    recorder.record(due, onBreak(40), 100);
    recorder.record(onBreak(40), startWorking(120), 120);

    expect(stored()).toEqual([
      { kind: 'work', startedAt: 0, endedAt: 40 },
      { kind: 'break', startedAt: 40, endedAt: 120 },
      { kind: 'work', startedAt: 120, endedAt: null },
    ]);
  });

  it('records nothing while paused and ends the open session on quit', () => {
    const recorder = createSessionRecorder(sessions, logger);
    recorder.begin(startWorking(0), 0);

    recorder.record(startWorking(0), paused, 30);
    recorder.heartbeat(40); // nothing open: ignored
    recorder.record(paused, startWorking(60), 60);
    recorder.finish(90);

    expect(stored()).toEqual([
      { kind: 'work', startedAt: 0, endedAt: 30 },
      { kind: 'work', startedAt: 60, endedAt: 90 },
    ]);
  });

  it('starts nothing when the app starts paused', () => {
    createSessionRecorder(sessions, logger).begin(paused, 0);

    expect(stored()).toEqual([]);
  });

  it('never ends a session before it started, even if the clock went back', () => {
    const recorder = createSessionRecorder(sessions, logger);
    recorder.begin(startWorking(100), 100);

    recorder.finish(40);

    expect(stored()).toEqual([{ kind: 'work', startedAt: 100, endedAt: 100 }]);
  });

  it('logs database errors instead of throwing', () => {
    const failing = {
      ...sessions,
      start: () => {
        throw new Error('disk full');
      },
    };
    const recorder = createSessionRecorder(failing, logger);

    expect(() => recorder.begin(startWorking(0), 0)).not.toThrow();
    expect(() => recorder.heartbeat(10)).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith('[db] could not record a session', expect.any(Error));
  });

  describe('across restarts', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'mocha-sessions-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('keeps sessions and closes one a crash left open at its last heartbeat', () => {
      const path = join(dir, 'mocha.db');
      const first = openDatabase(path, logger);
      if (!first) throw new Error('database did not open');
      const before = createSessionRecorder(createSessionRepository(first), logger);
      before.begin(startWorking(0), 0);
      before.heartbeat(60_000);
      before.heartbeat(120_000);
      first.close(); // a crash: finish() never runs

      const second = openDatabase(path, logger);
      if (!second) throw new Error('database did not reopen');
      sessions = createSessionRepository(second);
      createSessionRecorder(sessions, logger).begin(startWorking(500_000), 500_000);

      expect(stored()).toEqual([
        { kind: 'work', startedAt: 0, endedAt: 120_000 },
        { kind: 'work', startedAt: 500_000, endedAt: null },
      ]);
      expect(logger.warn).toHaveBeenCalledWith('[db] closed 1 session(s) left open by a crash');
      second.close();
    });
  });
});
