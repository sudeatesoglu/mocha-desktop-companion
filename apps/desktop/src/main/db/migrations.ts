import type { DatabaseSync } from 'node:sqlite';

export interface Migration {
  /** Consecutive, starting at 1. Never change a migration that has shipped. */
  version: number;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    // Only kinds and timestamps (ms since the epoch): never what the user did.
    sql: `
      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('work', 'break')),
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        CHECK (ended_at IS NULL OR ended_at >= started_at)
      );
      CREATE INDEX sessions_started_at ON sessions (started_at);
    `,
  },
  {
    version: 2,
    // The last time the app saw an open session alive, so a session left
    // open by a crash can be closed then instead of at its start.
    sql: 'ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER',
  },
  {
    version: 3,
    // Mocha's needs (ADR-0008): one row with two numbers, the counters of
    // their caps and timestamps. Nothing about what the user does.
    sql: `
      CREATE TABLE needs (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        mood REAL NOT NULL CHECK (mood BETWEEN 0 AND 100),
        energy REAL NOT NULL CHECK (energy BETWEEN 0 AND 100),
        updated_at INTEGER NOT NULL,
        last_pet_at INTEGER,
        treat_day INTEGER NOT NULL,
        treats_today INTEGER NOT NULL CHECK (treats_today >= 0)
      );
    `,
  },
];

// `PRAGMA user_version` always returns exactly one row.
const schemaVersion = (db: DatabaseSync): number =>
  Number(db.prepare('PRAGMA user_version').get()?.['user_version']);

/**
 * Brings the database up to the newest version. Each migration runs in its
 * own transaction together with the version bump, so a failing one leaves
 * the database exactly as it was before that migration.
 */
export function runMigrations(db: DatabaseSync, migrations: readonly Migration[]): void {
  migrations.forEach(({ version }, index) => {
    if (version !== index + 1) throw new Error(`migration ${index + 1} has version ${version}`);
  });

  const current = schemaVersion(db);
  if (current > migrations.length) {
    // Written by a newer Mocha: guessing at its schema could damage the data.
    throw new Error(`database version ${current} is newer than this app (${migrations.length})`);
  }

  for (const { version, sql } of migrations.slice(current)) {
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
