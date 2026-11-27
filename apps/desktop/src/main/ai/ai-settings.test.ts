import { describe, expect, it, vi } from 'vitest';
import type { AiProvider } from './ai-provider.ts';
import { aiView, applyAiChange, DEFAULT_AI, providerFor, tryAi } from './ai-settings.ts';

const KEY = 'sk-ant-api03-0123456789abcdefghijKLMN';
const MODELS = ['llama3.2:latest', 'mistral:7b'];

describe('aiView', () => {
  it('shows whether there is a key, never the key', () => {
    const view = aiView({ ...DEFAULT_AI, claudeKey: 'c2VhbGVk' }, MODELS, true);

    expect(view).toEqual({
      provider: 'off',
      localModels: MODELS,
      localModel: null,
      claudeModel: 'claude-haiku-5-5',
      hasClaudeKey: true,
      canStoreKey: true,
      features: { chat: false, chatBrowsing: false, insights: false, comments: false },
    });
    expect(JSON.stringify(view)).not.toContain('c2VhbGVk');
  });
});

describe('applyAiChange', () => {
  it('changes one thing at a time', () => {
    expect(
      applyAiChange(DEFAULT_AI, { change: 'provider', provider: 'local' }, MODELS),
    ).toMatchObject({
      provider: 'local',
    });
    expect(
      applyAiChange(DEFAULT_AI, { change: 'claudeModel', model: 'claude-sonnet-5-5' }, null),
    ).toMatchObject({ claudeModel: 'claude-sonnet-5-5' });
    expect(
      applyAiChange(DEFAULT_AI, { change: 'feature', feature: 'chat', enabled: true }, null)
        .features,
    ).toEqual({ chat: true, chatBrowsing: false, insights: false, comments: false });
  });

  it('takes a local model only if Ollama has it', () => {
    expect(
      applyAiChange(DEFAULT_AI, { change: 'localModel', model: 'mistral:7b' }, MODELS),
    ).toMatchObject({
      localModel: 'mistral:7b',
    });
    expect(applyAiChange(DEFAULT_AI, { change: 'localModel', model: 'evil:1b' }, MODELS)).toBe(
      DEFAULT_AI,
    );
    expect(applyAiChange(DEFAULT_AI, { change: 'localModel', model: 'mistral:7b' }, null)).toBe(
      DEFAULT_AI,
    );
  });
});

describe('providerFor', () => {
  const deps = (key?: string) => ({ fetch: vi.fn(), claudeKey: () => key });

  it('is nothing while AI is off', () => {
    expect(providerFor(DEFAULT_AI, deps(KEY))).toBeUndefined();
  });

  it('asks Ollama with the picked model, or says one is missing', () => {
    expect(
      providerFor({ ...DEFAULT_AI, provider: 'local', localModel: 'mistral:7b' }, deps()),
    ).toHaveProperty('answer');
    expect(providerFor({ ...DEFAULT_AI, provider: 'local' }, deps())).toBe('no model');
  });

  it('asks Claude with a key it can read, or says the key is the problem', () => {
    expect(providerFor({ ...DEFAULT_AI, provider: 'claude' }, deps(KEY))).toHaveProperty('answer');
    expect(providerFor({ ...DEFAULT_AI, provider: 'claude' }, deps())).toBe('wrong key');
  });
});

describe('tryAi', () => {
  const answering = (result: Awaited<ReturnType<AiProvider['answer']>>): AiProvider => ({
    answer: vi.fn(async () => result),
  });

  it('shows the model’s hello as one clean line', async () => {
    expect(await tryAi(answering({ ok: true, text: '"**Caw!** Hello\nthere."' }))).toEqual({
      ok: true,
      text: 'Caw! Hello there.',
    });
  });

  it('passes a problem on, from the model or from the setup', async () => {
    expect(await tryAi(answering({ ok: false, problem: 'busy' }))).toEqual({
      ok: false,
      problem: 'busy',
    });
    expect(await tryAi('no model')).toEqual({ ok: false, problem: 'no model' });
    expect(await tryAi(undefined)).toEqual({ ok: false, problem: 'unavailable' });
  });
});
