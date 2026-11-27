/** Where Mocha's language model runs, if anywhere (ADR-0013). */
export const AI_PROVIDERS = ['off', 'local', 'claude'] as const;
export type AiProviderChoice = (typeof AI_PROVIDERS)[number];

/** The Claude models the user may pick; the first is the default, quick and cheap. */
export const CLAUDE_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5'] as const;
export type ClaudeModel = (typeof CLAUDE_MODELS)[number];

/** What a model may be used for, each off until the user turns it on. */
export const AI_FEATURES = ['chat', 'chatBrowsing', 'insights', 'comments'] as const;
export type AiFeature = (typeof AI_FEATURES)[number];
export type AiFeatures = Readonly<Record<AiFeature, boolean>>;
export const NO_AI_FEATURES: AiFeatures = {
  chat: false,
  chatBrowsing: false,
  insights: false,
  comments: false,
};

/** Why a model could not answer, in terms the user can act on. */
export type AiProblem =
  | 'not running'
  | 'no model'
  | 'wrong key'
  | 'busy'
  | 'timeout'
  | 'unavailable';

/** The AI section as Settings shows it. The key itself never leaves main. */
export interface AiView {
  provider: AiProviderChoice;
  /** Ollama's installed models, or null when Ollama does not answer. */
  localModels: string[] | null;
  localModel: string | null;
  /** The local model that reads pages, or null for Mocha's own model (ADR-0014). */
  readerModel: string | null;
  claudeModel: ClaudeModel;
  hasClaudeKey: boolean;
  /** Whether the keychain can encrypt a key on this computer. */
  canStoreKey: boolean;
  features: AiFeatures;
}

/** A change to the AI section, one at a time. */
export type AiChange =
  | { change: 'provider'; provider: AiProviderChoice }
  | { change: 'localModel'; model: string }
  | { change: 'readerModel'; model: string | null }
  | { change: 'claudeModel'; model: ClaudeModel }
  | { change: 'feature'; feature: AiFeature; enabled: boolean };

/** What "Try it" got back. */
export type AiTry = { ok: true; text: string } | { ok: false; problem: AiProblem };

export const AI_PROBLEM_TEXTS: Readonly<Record<AiProblem, string>> = {
  'not running': 'Ollama isn’t answering. Is it running?',
  'no model': 'That model isn’t available. Pick another one.',
  'wrong key': 'Claude refused the key. Check it in your Anthropic account.',
  busy: 'The model is busy. Try again in a minute.',
  timeout: 'The model took too long to answer.',
  unavailable: 'The model couldn’t answer just now.',
};

/** Each AI feature in plain words, with what it may see (ADR-0013). */
export const AI_FEATURE_TEXTS: readonly { name: AiFeature; label: string; hint: string }[] = [
  {
    name: 'chat',
    label: 'Chat with Mocha',
    hint: 'In the Tower. The model sees your messages, today’s and this week’s numbers, and what Mocha remembers.',
  },
  {
    name: 'chatBrowsing',
    label: 'Let the chat see what you browse',
    hint: 'So you can ask Mocha about it. The model sees the last half hour of the browser details you allow, kept only in memory; what you and Mocha say about it is kept like any chat.',
  },
  {
    name: 'insights',
    label: 'A weekly insight',
    hint: 'Once a week, a few words about your work and rest. The model sees the week’s numbers per day.',
  },
  {
    name: 'comments',
    label: 'Let AI write Mocha’s comments',
    hint: 'Instead of its fixed lines. The model sees only the browser details you allow under Browser.',
  },
];

/** What the reader model does, and where page text goes (ADR-0014). */
export function readerHint(view: Pick<AiView, 'provider' | 'readerModel'>): string {
  const what =
    'Reads the pages you allow under Browser and keeps a one-sentence gist, in memory only.';
  if (view.readerModel) return `${what} Page text stays on this computer.`;
  if (view.provider === 'claude') return `${what} With Claude, page text goes to Anthropic.`;
  return what;
}

/** What to do when Ollama has no model to offer, or nothing when it has. */
export function localModelHint(models: string[] | null): string {
  if (models === null) return 'Ollama isn’t running. Install it from ollama.com and open it.';
  if (models.length === 0) return 'No models yet. In Terminal, run: ollama pull llama3.2';
  return '';
}

/** Whether the key is kept, or why it would not be. */
export function claudeKeyHint(view: Pick<AiView, 'hasClaudeKey' | 'canStoreKey'>): string {
  if (view.hasClaudeKey) return 'Your key is saved, encrypted by macOS. It is never shown again.';
  if (!view.canStoreKey) return 'This Mac can’t encrypt a key right now, so it would not be kept.';
  return 'Your key is kept encrypted by macOS and never shown again.';
}
