import { DatabaseSync } from 'node:sqlite';
import { type FindsEvent, startFinds } from '@mocha/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFindsRepository, type FindsRepository } from '../db/finds-repository.ts';
import { MIGRATIONS, runMigrations } from '../db/migrations.ts';
import { createFindsKeeper } from './finds-keeper.ts';

const MINUTE = 60_000;
const now = new Date(2026, 10, 16, 9).getTime();
/** A break after 40 minutes of work with a ritual: two points. */
const rest = (at: number): FindsEvent => ({
  type: 'breakEnded',
  now: at,
  workMs: 40 * MINUTE,
  breakMs: 10 * MINUTE,
  ritual: true,
});
const first = () => 0;

describe('createFindsKeeper', () => {
  const logger = { warn: vi.fn() };
  let repository: FindsRepository;

  beforeEach(() => {
    logger.warn.mockClear();
    const db = new DatabaseSync(':memory:');
    runMigrations(db, MIGRATIONS);
    repository = createFindsRepository(db);
  });

  it('starts with nothing found, with or without a database', () => {
    expect(createFindsKeeper(repository, now, logger).state).toEqual(startFinds(now));
    expect(createFindsKeeper(undefined, now, logger).state).toEqual(startFinds(now));
  });

  it('saves every change and restores it on the next start', () => {
    const finds = createFindsKeeper(repository, now, logger, first);
    finds.dispatch(rest(now + 60 * MINUTE));
    finds.dispatch(rest(now + 120 * MINUTE));

    const restarted = createFindsKeeper(repository, now + 200 * MINUTE, logger);
    expect(restarted.state).toEqual(finds.state);
    expect(restarted.state.found).toEqual([{ id: 'redScarf', foundAt: now + 120 * MINUTE }]);
  });

  it('tells listeners what each change found', () => {
    const finds = createFindsKeeper(repository, now, logger, first);
    const listener = vi.fn();
    const stop = finds.onChange(listener);

    finds.dispatch(rest(now + 60 * MINUTE));
    finds.dispatch(rest(now + 120 * MINUTE));
    stop();
    finds.dispatch(rest(now + 180 * MINUTE));

    expect(listener.mock.calls.map(([, found]) => found)).toEqual([
      [],
      [{ id: 'redScarf', foundAt: now + 120 * MINUTE }],
    ]);
  });

  it('ignores an event that changes nothing', () => {
    const finds = createFindsKeeper(repository, now, logger);
    const listener = vi.fn();
    finds.onChange(listener);

    finds.dispatch({ ...rest(now), workMs: 0 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps going when the database fails', () => {
    const broken = {
      load: () => {
        throw new Error('disk gone');
      },
      save: () => {
        throw new Error('disk gone');
      },
    };
    const finds = createFindsKeeper(broken, now, logger, first);
    finds.dispatch(rest(now + 60 * MINUTE));

    expect(finds.state.points).toBe(2);
    expect(logger.warn.mock.calls.map(([message]) => message)).toEqual([
      '[db] could not read what Mocha found, starting fresh',
      '[db] could not save what Mocha found',
    ]);
  });
});
