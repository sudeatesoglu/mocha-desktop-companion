import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MIGRATIONS } from './migrations.ts';
import { openDatabase } from './open-database.ts';

describe('openDatabase', () => {
  let dir: string;
  let path: string;
  const logger = { warn: vi.fn() };

  beforeEach(() => {
    logger.warn.mockClear();
    dir = mkdtempSync(join(tmpdir(), 'mocha-db-'));
    path = join(dir, 'mocha.db');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates the file, migrates it and keeps data across reopening', () => {
    const first = openDatabase(path, logger);
    first?.prepare('INSERT INTO sessions (kind, started_at) VALUES (?, ?)').run('work', 1);
    first?.close();

    const second = openDatabase(path, logger);

    expect(second?.prepare('SELECT kind FROM sessions').all()).toEqual([{ kind: 'work' }]);
    expect(second?.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
    second?.close();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns undefined for a corrupt file and leaves the file in place', () => {
    const garbage = 'this is not a database file '.repeat(100);
    writeFileSync(path, garbage);

    expect(openDatabase(path, logger)).toBeUndefined();

    expect(logger.warn).toHaveBeenCalledOnce();
    expect(readFileSync(path, 'utf8')).toBe(garbage);
  });

  it('returns undefined when a migration fails, keeping existing data', () => {
    openDatabase(path, logger)?.close();

    const db = openDatabase(path, logger, [
      ...MIGRATIONS,
      { version: MIGRATIONS.length + 1, sql: 'THIS IS NOT SQL' },
    ]);
    expect(db).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledOnce();

    const reopened = openDatabase(path, logger);
    expect(reopened?.prepare('PRAGMA user_version').get()).toEqual({
      user_version: MIGRATIONS.length,
    });
    reopened?.close();
  });

  it('returns undefined when the folder does not exist', () => {
    expect(openDatabase(join(dir, 'missing', 'mocha.db'), logger)).toBeUndefined();
  });
});
