import { DatabaseSync } from 'node:sqlite';
import { type FindsState, startFinds } from '@mocha/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { createFindsRepository, type FindsRepository } from './finds-repository.ts';
import { MIGRATIONS, runMigrations } from './migrations.ts';

describe('createFindsRepository', () => {
  let db: DatabaseSync;
  let finds: FindsRepository;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    runMigrations(db, MIGRATIONS);
    finds = createFindsRepository(db);
  });

  it('has nothing before the first save', () => {
    expect(finds.load()).toBeUndefined();
  });

  it('saves the meter and the finds, oldest first', () => {
    const state: FindsState = {
      found: [
        { id: 'bowTie', foundAt: 2_000 },
        { id: 'fern', foundAt: 1_000 },
      ],
      points: 2,
      day: 500,
      findsToday: 1,
    };
    finds.save(state);

    expect(finds.load()).toEqual({
      ...state,
      found: [
        { id: 'fern', foundAt: 1_000 },
        { id: 'bowTie', foundAt: 2_000 },
      ],
    });
  });

  it('keeps every find and the time it was first found', () => {
    finds.save({ ...startFinds(0), found: [{ id: 'fern', foundAt: 1_000 }] });
    finds.save({ ...startFinds(0), found: [{ id: 'fern', foundAt: 9_000 }] });
    finds.save(startFinds(0));

    expect(finds.load()?.found).toEqual([{ id: 'fern', foundAt: 1_000 }]);
  });

  it('leaves out items this version does not know', () => {
    finds.save(startFinds(0));
    db.prepare("INSERT INTO finds (item_id, found_at) VALUES ('crown', 5)").run();

    expect(finds.load()?.found).toEqual([]);
  });

  it('writes nothing when a part of the save fails', () => {
    // The meter row is written first; the find after it breaks NOT NULL.
    const broken = { id: 'fern', foundAt: null as unknown as number } as const;

    expect(() => finds.save({ ...startFinds(0), found: [broken] })).toThrow();
    expect(finds.load()).toBeUndefined();
  });
});
