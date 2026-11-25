import { describe, expect, it } from 'vitest';
import {
  cleanMemory,
  MAX_MEMORY_CHARS,
  MAX_SUMMARY_CHARS,
  memoryQuery,
  parseSummary,
  summaryPrompt,
} from './memory.ts';

describe('memoryQuery', () => {
  it('searches for the words worth searching, quoted', () => {
    expect(memoryQuery('How is my Rust learning going?')).toBe('"rust" OR "learning" OR "going"');
    expect(memoryQuery('Türkçe öğreniyorum')).toBe('"türkçe" OR "öğreniyorum"');
  });

  it('cannot be turned into FTS5 syntax', () => {
    expect(memoryQuery('rust" OR text:* NEAR(a b) -x')).toBe('"rust" OR "text" OR "near"');
  });

  it('has nothing to search in small talk, and takes at most twelve words', () => {
    expect(memoryQuery('hi, how are you?')).toBeNull();
    expect(memoryQuery('ok? :)')).toBeNull();
    const long = memoryQuery(Array.from({ length: 20 }, (_, i) => `word${i}`).join(' '));
    expect(long?.split(' OR ')).toHaveLength(12);
    expect(memoryQuery('rust rust RUST')).toBe('"rust"');
  });
});

describe('cleanMemory', () => {
  it('keeps a plain fact, without its full stop', () => {
    expect(cleanMemory('Is learning Rust.')).toBe('Is learning Rust');
  });

  it('takes out emails, numbers and addresses', () => {
    expect(cleanMemory('Works at me@example.com, ext 5551234')).toBe('Works at ext');
  });

  it.each([
    'Their password is hunter2',
    'Şifresi kedi123',
    'ŞİFRESİ KEDİ',
    'Maaşı yüksek',
    'Kredi kartı var',
    'İlaç kullanıyor',
    'Takes medication for migraines',
    'Has a big debt',
    'Credit card ends in 4242',
    'ok',
    '...',
  ])('does not keep %j', (fact) => {
    expect(cleanMemory(fact)).toBeUndefined();
  });

  it('does not mistake a word that only contains a sensitive one', () => {
    expect(cleanMemory('Loves the Dubai skyline')).toBe('Loves the Dubai skyline');
    expect(cleanMemory('Likes classic debtors-prison novels')).toBeUndefined();
  });

  it.each([
    ['You are learning Rust', 'Is learning Rust'],
    ["You're into pixel art", 'Is into pixel art'],
    ['You have a cat named Pepper', 'Has a cat named Pepper'],
    ['The user is learning Go', 'Is learning Go'],
    ['You like tea', 'Like tea'],
  ])('writes %j about the user: %j', (fact, expected) => {
    expect(cleanMemory(fact)).toBe(expected);
  });

  it.each([
    'You have already taken two breaks today',
    'Your longest work stretch was 140 minutes',
    'Worked 5 hours this week',
    'Bugün çok çalıştı',
  ])('does not keep Mocha’s own numbers or passing moments: %j', (fact) => {
    expect(cleanMemory(fact)).toBeUndefined();
  });

  it('caps a long fact', () => {
    expect(cleanMemory('a'.repeat(500))).toHaveLength(MAX_MEMORY_CHARS);
  });
});

describe('summaryPrompt', () => {
  it('quotes the conversation as data and asks for JSON', () => {
    const prompt = summaryPrompt([
      { role: 'user', content: 'I started learning Rust' },
      { role: 'assistant', content: 'Caw! Crabs are friends.' },
    ]);
    const data = JSON.parse(prompt.system.slice(prompt.system.lastIndexOf('\n') + 1));

    expect(data.conversation).toEqual([
      { from: 'user', text: 'I started learning Rust' },
      { from: 'Mocha', text: 'Caw! Crabs are friends.' },
    ]);
    expect(prompt.turns[0]?.content).toMatch(/Reply with JSON only/);
  });
});

describe('parseSummary', () => {
  it('reads the summary and the facts, even wrapped in prose or a fence', () => {
    const answer =
      'Sure!\n```json\n{"summary": "We talked about **Rust**.", "remember": ["Is learning Rust.", "Is learning Rust", "Password is abc"]}\n```';

    expect(parseSummary(answer)).toEqual({
      summary: 'We talked about Rust.',
      remember: ['Is learning Rust'],
    });
  });

  it('keeps at most three facts and survives a wrong list', () => {
    const many = JSON.stringify({ summary: 'S', remember: ['Aaa', 'Bbb', 'Ccc', 'Ddd'] });
    const odd = JSON.stringify({ summary: 'S', remember: 'Aaa' });

    expect(parseSummary(many)?.remember).toEqual(['Aaa', 'Bbb', 'Ccc']);
    expect(parseSummary(odd)).toEqual({ summary: 'S', remember: [] });
  });

  it('caps the summary', () => {
    expect(
      parseSummary(JSON.stringify({ summary: 'word '.repeat(400) }))?.summary.length,
    ).toBeLessThanOrEqual(MAX_SUMMARY_CHARS);
  });

  it.each([
    ['no JSON', 'Just words.'],
    ['an unfinished answer', '{"summary": '],
    ['broken JSON', '{"summary": }'],
    ['the wrong shape', '{"text": "x"}'],
    ['an empty summary', '{"summary": "  "}'],
    ['braces the wrong way round', '} nothing {'],
  ])('returns nothing for %s', (_, answer) => {
    expect(parseSummary(answer)).toBeUndefined();
  });
});
