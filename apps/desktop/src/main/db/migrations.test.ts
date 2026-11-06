import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS, type Migration, runMigrations } from './migrations.ts';

const version = (db: DatabaseSync) => db.prepare('PRAGMA user_version').get()?.['user_version'];
const tables = (db: DatabaseSync) =>
  db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();

const CREATE_A: Migration = { version: 1, sql: 'CREATE TABLE a (id INTEGER)' };
const CREATE_B: Migration = { version: 2, sql: 'CREATE TABLE b (id INTEGER)' };

describe('runMigrations', () => {
  it('applies pending migrations in order and records the version', () => {
    const db = new DatabaseSync(':memory:');

    runMigrations(db, [CREATE_A, CREATE_B]);

    expect(version(db)).toBe(2);
    expect(tables(db)).toEqual([{ name: 'a' }, { name: 'b' }]);
  });

  it('runs only what is new', () => {
    const db = new DatabaseSync(':memory:');
    runMigrations(db, [CREATE_A]);

    runMigrations(db, [CREATE_A, CREATE_B]);
    runMigrations(db, [CREATE_A, CREATE_B]); // running again changes nothing

    expect(version(db)).toBe(2);
  });

  it('rolls a failing migration back completely and keeps earlier ones', () => {
    const db = new DatabaseSync(':memory:');
    const broken: Migration = {
      version: 2,
      sql: 'CREATE TABLE half_done (id INTEGER); CREATE TABLE a (id INTEGER);', // a exists
    };

    expect(() => runMigrations(db, [CREATE_A, broken])).toThrow();

    expect(version(db)).toBe(1);
    expect(tables(db)).toEqual([{ name: 'a' }]);
  });

  it('refuses a database written by a newer version', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA user_version = 5');

    expect(() => runMigrations(db, [CREATE_A])).toThrow('newer than this app');
    expect(tables(db)).toEqual([]);
  });

  it('rejects versions that are not consecutive', () => {
    const db = new DatabaseSync(':memory:');

    expect(() => runMigrations(db, [{ version: 2, sql: '' }])).toThrow('has version 2');
  });

  it('applies the real migrations to an empty database', () => {
    const db = new DatabaseSync(':memory:');

    runMigrations(db, MIGRATIONS);

    expect(version(db)).toBe(MIGRATIONS.length);
    expect(tables(db)).toContainEqual({ name: 'sessions' });
  });
});
