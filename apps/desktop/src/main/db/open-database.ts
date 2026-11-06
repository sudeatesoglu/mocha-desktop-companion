import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS, type Migration, runMigrations } from './migrations.ts';

/**
 * Opens and migrates the database. Returns undefined when that fails, for
 * example on a corrupt file: Mocha then runs without history instead of not
 * starting. The file is never deleted, so the user's data can still be saved.
 */
export function openDatabase(
  path: string,
  logger: { warn(message: string, details?: unknown): void },
  migrations: readonly Migration[] = MIGRATIONS,
): DatabaseSync | undefined {
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode = WAL'); // a crash cannot corrupt committed data
    runMigrations(db, migrations);
    return db;
  } catch (error) {
    logger.warn('[db] could not open the database, continuing without history', error);
    db?.close();
    return undefined;
  }
}
