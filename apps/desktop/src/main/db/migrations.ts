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
  {
    version: 4,
    // What Mocha found (ADR-0010): item ids with when they were found, and
    // the find meter in one row. Nothing about what the user does.
    sql: `
      CREATE TABLE finds (
        item_id TEXT PRIMARY KEY,
        found_at INTEGER NOT NULL
      );
      CREATE TABLE find_meter (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        points INTEGER NOT NULL CHECK (points >= 0),
        day INTEGER NOT NULL,
        finds_today INTEGER NOT NULL CHECK (finds_today >= 0)
      );
    `,
  },
  {
    version: 5,
    // Mocha's memory (ADR-0013): conversations and their messages, kept
    // for a while, their summaries, the facts Mocha remembers with a
    // full-text index kept in step by triggers, and the weekly insight.
    // Never anything about the user's browsing.
    sql: `
      CREATE TABLE conversations (
        id INTEGER PRIMARY KEY,
        started_at INTEGER NOT NULL,
        last_message_at INTEGER NOT NULL CHECK (last_message_at >= started_at),
        summary TEXT CHECK (summary IS NULL OR length(summary) BETWEEN 1 AND 600)
      );
      CREATE INDEX conversations_last_message_at ON conversations (last_message_at);
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'mocha')),
        text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 4000),
        created_at INTEGER NOT NULL
      );
      CREATE INDEX messages_conversation ON messages (conversation_id, id);
      CREATE INDEX messages_created_at ON messages (created_at);
      CREATE TABLE memories (
        id INTEGER PRIMARY KEY,
        text TEXT NOT NULL UNIQUE CHECK (length(text) BETWEEN 3 AND 200),
        pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
        created_at INTEGER NOT NULL,
        last_used_at INTEGER,
        uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0)
      );
      CREATE VIRTUAL TABLE memories_fts USING fts5 (
        text, content = 'memories', content_rowid = 'id',
        tokenize = 'unicode61 remove_diacritics 2'
      );
      -- Deleted words leave the index itself, not just its lookups.
      INSERT INTO memories_fts (memories_fts, rank) VALUES ('secure-delete', 1);
      CREATE TRIGGER memories_inserted AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts (rowid, text) VALUES (new.id, new.text);
      END;
      CREATE TRIGGER memories_deleted AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts (memories_fts, rowid, text) VALUES ('delete', old.id, old.text);
      END;
      CREATE TRIGGER memories_edited AFTER UPDATE OF text ON memories BEGIN
        INSERT INTO memories_fts (memories_fts, rowid, text) VALUES ('delete', old.id, old.text);
        INSERT INTO memories_fts (rowid, text) VALUES (new.id, new.text);
      END;
      CREATE TABLE insights (
        week_start INTEGER PRIMARY KEY,
        text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 1000),
        created_at INTEGER NOT NULL
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
