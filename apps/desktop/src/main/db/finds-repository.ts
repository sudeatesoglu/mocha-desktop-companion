import type { DatabaseSync } from 'node:sqlite';
import { type FindsState, ITEMS, type ItemId } from '@mocha/core';

const KNOWN = new Set<string>(ITEMS.map(({ id }) => id));

/**
 * Reads and writes what Mocha found and its find meter. A save writes both
 * in one transaction, so they never disagree. Values always go through
 * bound parameters.
 */
export function createFindsRepository(db: DatabaseSync) {
  const selectMeter = db.prepare(
    'SELECT points, day, finds_today AS findsToday FROM find_meter WHERE id = 1',
  );
  const selectFinds = db.prepare(
    'SELECT item_id AS id, found_at AS foundAt FROM finds ORDER BY found_at, item_id',
  );
  const upsertMeter = db.prepare(`
    INSERT INTO find_meter (id, points, day, finds_today) VALUES (1, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      points = excluded.points, day = excluded.day, finds_today = excluded.finds_today
  `);
  // Finds are never lost: a save only adds the new ones.
  const insertFind = db.prepare(
    'INSERT INTO finds (item_id, found_at) VALUES (?, ?) ON CONFLICT (item_id) DO NOTHING',
  );

  return {
    /** The saved meter and finds, or undefined before the first save. */
    load(): FindsState | undefined {
      const meter = selectMeter.get() as
        | { points: number; day: number; findsToday: number }
        | undefined;
      if (!meter) return undefined;
      const rows = selectFinds.all() as { id: string; foundAt: number }[];
      // An item a newer version knew and this one does not is left out.
      const found = rows.filter(({ id }) => KNOWN.has(id)) as { id: ItemId; foundAt: number }[];
      return { found, ...meter };
    },
    save(finds: FindsState): void {
      db.exec('BEGIN');
      try {
        upsertMeter.run(finds.points, finds.day, finds.findsToday);
        for (const { id, foundAt } of finds.found) insertFind.run(id, foundAt);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

export type FindsRepository = ReturnType<typeof createFindsRepository>;
