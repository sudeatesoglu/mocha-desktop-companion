import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CONVERSATION_IDLE_MS, MAX_MEMORIES, memoryQuery } from '@mocha/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRepository, type MemoryRepository } from './memory-repository.ts';
import { MIGRATIONS, runMigrations } from './migrations.ts';
import { openDatabase } from './open-database.ts';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('createMemoryRepository', () => {
  let db: DatabaseSync;
  let memory: MemoryRepository;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    runMigrations(db, MIGRATIONS);
    memory = createMemoryRepository(db);
  });

  describe('conversations', () => {
    it('keeps talking in one conversation, and starts another after a quiet spell', () => {
      const first = memory.addMessage('user', 'hi', 0);
      memory.addMessage('mocha', 'caw', MINUTE);
      expect(memory.currentConversation(2 * MINUTE)).toBe(first);

      const second = memory.addMessage('user', 'back', MINUTE + CONVERSATION_IDLE_MS);
      expect(second).not.toBe(first);
      expect(memory.turns(first, 10)).toEqual([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'caw' },
      ]);
      expect(memory.currentConversation(10 * CONVERSATION_IDLE_MS)).toBeUndefined();
    });

    it('gives the newest turns, oldest first', () => {
      const id = memory.addMessage('user', 'one', 0);
      memory.addMessage('mocha', 'two', 1);
      memory.addMessage('user', 'three', 2);

      expect(memory.turns(id, 2).map((turn) => turn.content)).toEqual(['two', 'three']);
    });

    it('sums up ended conversations once', () => {
      const id = memory.addMessage('user', 'I am learning Rust', 0);
      expect(memory.toSummarize(MINUTE, 5)).toEqual([]);

      const later = CONVERSATION_IDLE_MS + MINUTE;
      expect(memory.toSummarize(later, 5)).toEqual([
        { id, turns: [{ role: 'user', content: 'I am learning Rust' }] },
      ]);
      memory.saveSummary(id, 'We talked about Rust.');
      expect(memory.toSummarize(later, 5)).toEqual([]);
      expect(memory.summaries(3)).toEqual(['We talked about Rust.']);
    });

    it('lists the newest summaries first', () => {
      for (const [at, text] of [
        [0, 'first'],
        [DAY, 'second'],
      ] as const) {
        memory.saveSummary(memory.addMessage('user', text, at), `About ${text}.`);
      }

      expect(memory.summaries(1)).toEqual(['About second.']);
    });

    it('deletes old messages but keeps summaries, and drops what is left empty', () => {
      const summed = memory.addMessage('user', 'old and summed up', 0);
      memory.saveSummary(summed, 'An old chat.');
      memory.addMessage('user', 'old, never summed up', DAY);
      const recent = memory.addMessage('user', 'recent', 95 * DAY);

      memory.prune(95 * DAY, 90);

      expect(memory.turns(summed, 10)).toEqual([]);
      expect(memory.summaries(5)).toEqual(['An old chat.']);
      expect(memory.turns(recent, 10)).toHaveLength(1);
      expect(db.prepare('SELECT count(*) AS n FROM conversations').get()?.['n']).toBe(2);
    });

    it('refuses what the schema does not allow', () => {
      expect(() => memory.addMessage('user', '', 0)).toThrow();
      expect(() => memory.addMessage('user', 'x'.repeat(4_001), 0)).toThrow();
      expect(db.prepare('SELECT count(*) AS n FROM conversations').get()?.['n']).toBe(0);
    });

    it('deletes a conversation’s messages with it', () => {
      const id = memory.addMessage('user', 'hi', 0);
      db.prepare('DELETE FROM conversations WHERE id = ?').run(id);

      expect(db.prepare('SELECT count(*) AS n FROM messages').get()?.['n']).toBe(0);
    });
  });

  describe('memories', () => {
    it('remembers each fact once and lists the newest first', () => {
      memory.remember(['Is learning Rust', 'Likes short breaks'], 0);
      memory.remember(['Is learning Rust'], 1);

      expect(memory.memories().map(({ text }) => text)).toEqual([
        'Likes short breaks',
        'Is learning Rust',
      ]);
    });

    it('recalls pinned memories first, then the best matches, then the most used', () => {
      memory.remember(['Is learning Rust', 'Likes short breaks', 'Has a cat named Pepper'], 0);
      const [rust, breaks, cat] = memory.memories().sort((a, b) => a.id - b.id);
      memory.pinMemory(cat?.id as number, true);

      expect(memory.recall(memoryQuery('How is my rust going?'), 2, MINUTE)).toEqual([
        'Has a cat named Pepper',
        'Is learning Rust',
      ]);
      expect(memory.recall(null, 3, MINUTE)).toEqual([
        'Has a cat named Pepper',
        'Is learning Rust',
        'Likes short breaks',
      ]);
      expect(breaks?.pinned).toBe(false);
      expect(rust?.text).toBe('Is learning Rust');
    });

    it('finds words with or without Turkish marks', () => {
      memory.remember(['Türkçe öğreniyor'], 0);

      expect(memory.recall(memoryQuery('turkce'), 1, 0)).toEqual(['Türkçe öğreniyor']);
    });

    it('edits, pins and forgets one memory, keeping the search in step', () => {
      memory.remember(['Is learning Rust', 'Likes tea'], 0);
      const rust = memory.memories().find(({ text }) => text === 'Is learning Rust');
      const id = rust?.id as number;

      expect(memory.editMemory(id, 'Is learning Go')).toBe(true);
      expect(memory.editMemory(id, 'Likes tea')).toBe(false);
      expect(memory.recall(memoryQuery('rust'), 1, 0)).not.toContain('Is learning Rust');
      expect(memory.recall(memoryQuery('go'), 5, 0)).toContain('Is learning Go');

      memory.pinMemory(id, true);
      expect(memory.memories()[0]).toMatchObject({ id, pinned: true });
      memory.pinMemory(id, false);
      expect(memory.memories().find((m) => m.id === id)?.pinned).toBe(false);

      memory.forgetMemory(id);
      expect(memory.memories().map(({ text }) => text)).toEqual(['Likes tea']);
      expect(
        db.prepare("SELECT count(*) AS n FROM memories_fts WHERE memories_fts MATCH 'go'").get()?.[
          'n'
        ],
      ).toBe(0);
    });

    it('keeps at most the cap, dropping the least used first and never a pinned one', () => {
      memory.remember(['Pinned fact'], 0);
      const pinned = memory.memories()[0]?.id as number;
      memory.pinMemory(pinned, true);
      memory.remember(['Used fact'], 1);
      memory.recall(memoryQuery('used'), 2, 2);
      memory.remember(
        Array.from(
          { length: MAX_MEMORIES },
          (_, i) => `Fact number ${String(i).padStart(3, '0')} here`,
        ),
        3,
      );
      const texts = memory.memories().map(({ text }) => text);

      expect(texts).toHaveLength(MAX_MEMORIES);
      expect(texts).toContain('Pinned fact');
      expect(texts).toContain('Used fact');
    });
  });

  describe('the weekly insight', () => {
    it('keeps only the latest week', () => {
      expect(memory.insight()).toBeUndefined();
      memory.saveInsight(0, 'A calm week.', 1);
      memory.saveInsight(7 * DAY, 'A busy week.', 2);
      memory.saveInsight(7 * DAY, 'A busy week, with good breaks.', 3);

      expect(memory.insight()).toEqual({
        weekStart: 7 * DAY,
        text: 'A busy week, with good breaks.',
      });
      expect(db.prepare('SELECT count(*) AS n FROM insights').get()?.['n']).toBe(1);
    });
  });
});

describe('forgetting everything', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mocha-memory-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('leaves nothing of what Mocha knew in the file', () => {
    const path = join(dir, 'mocha.db');
    const db = openDatabase(path, { warn: () => {} }) as DatabaseSync;
    const memory = createMemoryRepository(db);
    const secrets = [
      'ZebraOrchidMessage',
      'QuokkaSummaryText',
      'NarwhalMemoryFact',
      'PangolinInsight',
    ];
    const id = memory.addMessage('user', `I said ${secrets[0]}`, 0);
    memory.saveSummary(id, `About ${secrets[1]}.`);
    memory.remember([`Knows ${secrets[2]}`], 0);
    memory.saveInsight(0, `A week of ${secrets[3]}.`, 0);
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    const before = readFileSync(path).toString('latin1');
    expect(secrets.every((secret) => before.includes(secret))).toBe(true);

    memory.forgetEverything();
    db.close();

    const files = ['mocha.db', 'mocha.db-wal', 'mocha.db-shm']
      .map((name) => join(dir, name))
      .filter((file) => existsSync(file))
      .map((file) => readFileSync(file).toString('latin1'));
    for (const secret of secrets) {
      for (const file of files) expect(file).not.toContain(secret);
      // The search index keeps words in lower case.
      for (const file of files) expect(file).not.toContain(secret.toLowerCase());
    }
  });
});
