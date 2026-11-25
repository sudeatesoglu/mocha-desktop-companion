import { DatabaseSync } from 'node:sqlite';
import { CONVERSATION_IDLE_MS, MESSAGE_RETENTION_DAYS, type Prompt } from '@mocha/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiProblem } from '../../shared/ai.ts';
import { createMemoryRepository, type MemoryRepository } from '../db/memory-repository.ts';
import { MIGRATIONS, runMigrations } from '../db/migrations.ts';
import type { AiProvider, AiResult } from './ai-provider.ts';
import { createChatService, toDayNumbers } from './chat-service.ts';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const dataOf = (prompt: Prompt) =>
  JSON.parse(prompt.system.slice(prompt.system.lastIndexOf('\n') + 1));

function setup() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  runMigrations(db, MIGRATIONS);
  const memory: MemoryRepository = createMemoryRepository(db);
  const world = {
    enabled: true,
    now: 10 * DAY,
    answers: [] as AiResult[],
    problem: undefined as AiProblem | undefined,
    aiOff: false,
  };
  const prompts: Prompt[] = [];
  const provider: AiProvider = {
    answer: vi.fn(async (prompt: Prompt, options?: { onText?: (piece: string) => void }) => {
      prompts.push(prompt);
      const next = world.answers.shift() ?? { ok: true, text: 'Caw!' };
      if (next.ok) for (const piece of next.text.split(' ')) options?.onText?.(piece);
      return next;
    }),
  };
  const chat = createChatService({
    memory,
    enabled: () => world.enabled,
    provider: () => (world.aiOff ? undefined : (world.problem ?? provider)),
    context: () => ({
      today: {
        day: 'today',
        minutesWorked: 200,
        breaksTaken: 3,
        longestWorkWithoutBreakMinutes: 50,
      },
      feelings: { mood: 80, energy: 60 },
    }),
    now: () => world.now,
  });
  return { db, memory, world, prompts, provider, chat };
}

describe('createChatService', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it('answers as Mocha with the numbers, memories and summaries, and streams it', async () => {
    s.memory.remember(['Is learning Rust', 'Has a cat'], 0);
    s.memory.saveSummary(s.memory.addMessage('user', 'old chat', 0), 'We talked about cats.');
    s.world.answers.push({ ok: true, text: '**Rust** again? 🦀🦀 Nice.' });
    const pieces: string[] = [];

    const reply = await s.chat.send('How is my Rust going?', (piece) => pieces.push(piece));

    expect(reply).toEqual({ ok: true, text: 'Rust again? 🦀 Nice.' });
    expect(pieces.length).toBeGreaterThan(1);
    const data = dataOf(s.prompts[0] as Prompt);
    expect(data.today).toMatchObject({ minutesWorked: 200 });
    expect(data.mochaFeels).toEqual({ mood: 80, energy: 60 });
    expect(data.memories[0]).toBe('Is learning Rust');
    expect(data.earlierChats).toEqual(['We talked about cats.']);
    expect(s.prompts[0]?.turns.at(-1)).toEqual({ role: 'user', content: 'How is my Rust going?' });
  });

  it('keeps the conversation and sends it with the next message', async () => {
    await s.chat.send('hi');
    s.world.now += MINUTE;
    await s.chat.send('again');

    expect(s.chat.history()).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Caw!' },
      { role: 'user', content: 'again' },
      { role: 'assistant', content: 'Caw!' },
    ]);
    expect(s.prompts[1]?.turns.map((turn) => turn.content)).toEqual(['hi', 'Caw!', 'again']);
  });

  it('keeps nothing when the model fails, and says why', async () => {
    s.world.answers.push({ ok: false, problem: 'busy' }, { ok: true, text: ' ' });

    expect(await s.chat.send('hi')).toEqual({ ok: false, problem: 'busy' });
    expect(await s.chat.send('hi')).toEqual({ ok: false, problem: 'unavailable' });
    expect(s.chat.history()).toEqual([]);
  });

  it('asks no model while the chat is off or has no model, and ignores empty messages', async () => {
    s.world.enabled = false;
    expect(await s.chat.send('hi')).toEqual({ ok: false, problem: 'off' });
    s.world.enabled = true;
    s.world.problem = 'wrong key';
    expect(await s.chat.send('hi')).toEqual({ ok: false, problem: 'wrong key' });
    s.world.problem = undefined;
    s.world.aiOff = true;
    expect(await s.chat.send('hi')).toEqual({ ok: false, problem: 'off' });
    s.world.aiOff = false;
    expect(await s.chat.send('   ')).toEqual({ ok: false, problem: 'unavailable' });

    expect(s.provider.answer).not.toHaveBeenCalled();
  });

  it('starts afresh after a quiet spell', async () => {
    await s.chat.send('hi');
    s.world.now += CONVERSATION_IDLE_MS + MINUTE;

    expect(s.chat.history()).toEqual([]);
  });

  describe('tidy', () => {
    it('sums up ended conversations and remembers what Mocha learned', async () => {
      await s.chat.send('I started learning Rust');
      s.world.now += CONVERSATION_IDLE_MS + MINUTE;
      s.world.answers.push({
        ok: true,
        text: '{"summary": "We talked about Rust.", "remember": ["Is learning Rust", "Password is x"]}',
      });

      expect(await s.chat.tidy()).toEqual(['Is learning Rust']);
      expect(s.memory.summaries(1)).toEqual(['We talked about Rust.']);
      expect(s.memory.memories().map(({ text }) => text)).toEqual(['Is learning Rust']);
      expect(await s.chat.tidy()).toEqual([]);
    });

    it('tries a failed summary again later', async () => {
      await s.chat.send('hi');
      s.world.now += CONVERSATION_IDLE_MS + MINUTE;
      s.world.answers.push({ ok: true, text: 'not JSON' }, { ok: false, problem: 'busy' });

      expect(await s.chat.tidy()).toEqual([]);
      expect(await s.chat.tidy()).toEqual([]);
      expect(s.memory.toSummarize(s.world.now, 5)).toHaveLength(1);
    });

    it('sends nothing to a model while the chat is off, and still drops old messages', async () => {
      await s.chat.send('an old message');
      s.world.enabled = false;
      s.world.now += (MESSAGE_RETENTION_DAYS + 1) * DAY;
      const asked = vi.mocked(s.provider.answer).mock.calls.length;

      expect(await s.chat.tidy()).toEqual([]);
      expect(vi.mocked(s.provider.answer).mock.calls.length).toBe(asked);
      expect(s.db.prepare('SELECT count(*) AS n FROM messages').get()?.['n']).toBe(0);
    });
  });
});

describe('toDayNumbers', () => {
  it('gives the day in whole minutes', () => {
    expect(
      toDayNumbers('today', {
        activeMs: 312.4 * MINUTE,
        breaks: 2,
        longestStretchMs: 139.6 * MINUTE,
      }),
    ).toEqual({
      day: 'today',
      minutesWorked: 312,
      breaksTaken: 2,
      longestWorkWithoutBreakMinutes: 140,
    });
  });
});
