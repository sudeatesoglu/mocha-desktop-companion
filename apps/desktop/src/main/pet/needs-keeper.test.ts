import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_NEEDS_CONFIG, startNeeds } from '@mocha/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MIGRATIONS, runMigrations } from '../db/migrations.ts';
import { createNeedsRepository, type NeedsRepository } from '../db/needs-repository.ts';
import { openDatabase } from '../db/open-database.ts';
import { createNeedsKeeper } from './needs-keeper.ts';

const HOUR = 3_600_000;

describe('createNeedsKeeper', () => {
  const logger = { warn: vi.fn() };
  let repository: NeedsRepository;

  beforeEach(() => {
    logger.warn.mockClear();
    const db = new DatabaseSync(':memory:');
    runMigrations(db, MIGRATIONS);
    repository = createNeedsRepository(db);
  });

  it('starts rested and neutral when nothing was saved', () => {
    expect(createNeedsKeeper(repository, 1_000, logger).state).toEqual(startNeeds(1_000));
  });

  it('starts fresh without a database', () => {
    const needs = createNeedsKeeper(undefined, 1_000, logger);
    needs.save(); // nothing to write to: ignored

    expect(needs.state).toEqual(startNeeds(1_000));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('applies events and tells listeners about changes only', () => {
    const needs = createNeedsKeeper(repository, 0, logger);
    const listener = vi.fn();
    const unsubscribe = needs.onChange(listener);

    needs.dispatch({ type: 'elapse', now: HOUR, activity: 'work' });
    needs.dispatch({ type: 'elapse', now: HOUR, activity: 'work' }); // no time passed
    unsubscribe();
    needs.dispatch({ type: 'elapse', now: 2 * HOUR, activity: 'work' });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ energy: 100 - DEFAULT_NEEDS_CONFIG.energyDrainPerHour }),
    );
    expect(needs.state.energy).toBe(100 - 2 * DEFAULT_NEEDS_CONFIG.energyDrainPerHour);
  });

  it('logs read and write errors instead of throwing', () => {
    const broken = {
      load: () => {
        throw new Error('database is locked');
      },
      save: () => {
        throw new Error('disk full');
      },
    };

    const needs = createNeedsKeeper(broken, 0, logger);
    needs.save();

    expect(needs.state).toEqual(startNeeds(0));
    expect(logger.warn).toHaveBeenCalledWith(
      '[db] could not read Mocha’s needs, starting fresh',
      expect.any(Error),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      '[db] could not save Mocha’s needs',
      expect.any(Error),
    );
  });

  describe('across restarts', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'mocha-needs-'));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('restores the saved needs and counts the time the app was closed as rest', () => {
      const path = join(dir, 'mocha.db');
      const first = openDatabase(path, logger);
      if (!first) throw new Error('database did not open');
      const before = createNeedsKeeper(createNeedsRepository(first), 0, logger);
      before.dispatch({ type: 'elapse', now: 2 * HOUR, activity: 'work' }); // energy 40
      before.save();
      first.close();

      const second = openDatabase(path, logger);
      if (!second) throw new Error('database did not reopen');
      const after = createNeedsKeeper(createNeedsRepository(second), 2.25 * HOUR, logger);

      // A quarter of an hour of rest: 40 + 120 / 4.
      expect(after.state.energy).toBe(70);
      expect(after.state.updatedAt).toBe(2.25 * HOUR);
      second.close();
    });
  });
});
