import { describe, expect, it } from 'vitest';
import { AI_FEATURE_TEXTS, AI_FEATURES, claudeKeyHint, localModelHint } from './ai.ts';

describe('localModelHint', () => {
  it('says what to do without Ollama or a model, and nothing otherwise', () => {
    expect(localModelHint(null)).toMatch(/ollama\.com/);
    expect(localModelHint([])).toMatch(/ollama pull/);
    expect(localModelHint(['mistral:7b'])).toBe('');
  });
});

describe('claudeKeyHint', () => {
  it('says whether the key is kept, and why not', () => {
    expect(claudeKeyHint({ hasClaudeKey: true, canStoreKey: true })).toMatch(/saved/);
    expect(claudeKeyHint({ hasClaudeKey: false, canStoreKey: false })).toMatch(/would not be kept/);
    expect(claudeKeyHint({ hasClaudeKey: false, canStoreKey: true })).toMatch(/encrypted/);
  });
});

describe('AI_FEATURE_TEXTS', () => {
  it('explains every feature, with what the model sees', () => {
    expect(AI_FEATURE_TEXTS.map(({ name }) => name)).toEqual([...AI_FEATURES]);
    for (const { hint } of AI_FEATURE_TEXTS) expect(hint).toMatch(/model sees/);
  });
});
