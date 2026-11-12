import type { DatabaseSync } from 'node:sqlite';
import type { NeedsState } from '@mocha/core';

/**
 * Reads and writes Mocha's needs: a single row, replaced on every save.
 * Values always go through bound parameters.
 */
export function createNeedsRepository(db: DatabaseSync) {
  const select = db.prepare(`
    SELECT mood, energy, updated_at AS updatedAt, last_pet_at AS lastPetAt,
           treat_day AS treatDay, treats_today AS treatsToday
    FROM needs WHERE id = 1
  `);
  const upsert = db.prepare(`
    INSERT INTO needs (id, mood, energy, updated_at, last_pet_at, treat_day, treats_today)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      mood = excluded.mood, energy = excluded.energy, updated_at = excluded.updated_at,
      last_pet_at = excluded.last_pet_at, treat_day = excluded.treat_day,
      treats_today = excluded.treats_today
  `);

  return {
    /** The saved needs, or undefined before the first save. */
    load(): NeedsState | undefined {
      return select.get() as unknown as NeedsState | undefined;
    },
    save(needs: NeedsState): void {
      upsert.run(
        needs.mood,
        needs.energy,
        needs.updatedAt,
        needs.lastPetAt,
        needs.treatDay,
        needs.treatsToday,
      );
    },
  };
}

export type NeedsRepository = ReturnType<typeof createNeedsRepository>;
