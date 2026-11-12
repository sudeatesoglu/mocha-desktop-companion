import { DatabaseSync } from 'node:sqlite';
import { type NeedsState, startNeeds } from '@mocha/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, runMigrations } from './migrations.ts';
import { createNeedsRepository, type NeedsRepository } from './needs-repository.ts';

describe('createNeedsRepository', () => {
  let needs: NeedsRepository;

  beforeEach(() => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db, MIGRATIONS);
    needs = createNeedsRepository(db);
  });

  it('has nothing before the first save', () => {
    expect(needs.load()).toBeUndefined();
  });

  it('saves and replaces the one row', () => {
    const first = startNeeds(1_000);
    needs.save(first);
    const later: NeedsState = {
      ...first,
      mood: 72.5,
      energy: 41.25,
      updatedAt: 5_000,
      lastPetAt: 4_000,
      treatsToday: 2,
    };
    needs.save(later);

    expect(needs.load()).toEqual(later);
  });

  it('refuses values outside 0 to 100', () => {
    expect(() => needs.save({ ...startNeeds(0), energy: 101 })).toThrow();
    expect(needs.load()).toBeUndefined();
  });
});
